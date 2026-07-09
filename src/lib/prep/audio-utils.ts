// Speaking 録音用の音声ユーティリティ
//
// MediaRecorder が生成する webm/mp4 はブラウザ・保存経路によって
// 再生できない（duration 不明・デコード不可）ことがあるため、
// 録音後に WAV (PCM 16bit / 16kHz mono) へ変換して保持する。
// - WAV は正しい長さメタデータを持ち、全ブラウザで確実に再生できる
// - デコードに成功したこと自体が「録音が正常に取れた」ことの検証になる
// - 音量 (RMS) も算出し、無音録音（マイク不良）を検出できる

export interface ConvertedRecording {
  wavBlob: Blob;
  durationSec: number;
  /** 平均音量 (0〜1 程度)。0.005 未満はほぼ無音 */
  rms: number;
}

const TARGET_SAMPLE_RATE = 16000;

/** AudioBuffer をモノラル 16kHz に変換 */
async function resampleToMono(buffer: AudioBuffer): Promise<AudioBuffer> {
  const length = Math.ceil(buffer.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, Math.max(1, length), TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start();
  return offline.startRendering();
}

/** Float32 PCM → WAV (16bit) ファイル */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM チャンクサイズ
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** MediaRecorder の Blob を WAV へ変換する。デコードできない場合は例外を投げる */
export async function convertToWav(blob: Blob): Promise<ConvertedRecording> {
  const arrayBuffer = await blob.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("録音データが空です");
  }
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextCtor();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const mono = await resampleToMono(decoded);
    const samples = mono.getChannelData(0);
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
    const rms = Math.sqrt(sumSquares / Math.max(1, samples.length));
    return {
      wavBlob: encodeWav(samples, TARGET_SAMPLE_RATE),
      durationSec: mono.duration,
      rms,
    };
  } finally {
    ctx.close().catch(() => undefined);
  }
}

/** 録音に使う MediaRecorder の MIME タイプを環境に応じて選ぶ */
export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}
