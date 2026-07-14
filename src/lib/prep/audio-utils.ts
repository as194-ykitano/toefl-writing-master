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

/** サンプルレート変換（線形補間） */
function downsample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const left = Math.floor(pos);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = pos - left;
    out[i] = samples[left] * (1 - frac) + samples[right] * frac;
  }
  return out;
}

/**
 * Web Audio API で生の PCM を直接収集する録音クラス。
 *
 * MediaRecorder の webm/opus は「エンコードはできるがデコード（再生）できない」
 * 環境が存在するため（Windows のコーデック構成など）、圧縮コーデックを一切
 * 使わずに PCM → WAV を生成する。WAV の再生はコーデック不要なので、
 * 録音できた環境では必ず再生もできる。
 */
export class PcmRecorder {
  private ctx: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  private analyser: AnalyserNode;
  private levelData: Uint8Array;
  private chunks: Float32Array[] = [];
  private stopped = false;

  constructor(stream: MediaStream) {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextCtor();
    this.ctx.resume().catch(() => undefined);
    this.source = this.ctx.createMediaStreamSource(stream);

    // レベルメーター用
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.levelData = new Uint8Array(this.analyser.frequencyBinCount);
    this.source.connect(this.analyser);

    // PCM 収集（ScriptProcessorNode は非推奨だが全ブラウザで動作する）
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (this.stopped) return;
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.processor);
    // 出力へ接続しないと処理が走らないブラウザがあるため、音量 0 で接続
    const silent = this.ctx.createGain();
    silent.gain.value = 0;
    this.processor.connect(silent);
    silent.connect(this.ctx.destination);
  }

  /** 現在の入力レベル (0〜1)。レベルメーター表示用 */
  getLevel(): number {
    this.analyser.getByteTimeDomainData(this.levelData);
    let sum = 0;
    for (let i = 0; i < this.levelData.length; i++) {
      const v = (this.levelData[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / this.levelData.length) * 4);
  }

  /** 録音を終了し、WAV (16kHz mono) を生成する */
  stop(): ConvertedRecording {
    this.stopped = true;
    const sourceRate = this.ctx.sampleRate;
    try {
      this.processor.disconnect();
      this.source.disconnect();
    } catch {
      // すでに切断済みでも問題なし
    }
    this.ctx.close().catch(() => undefined);

    const total = this.chunks.reduce((a, c) => a + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [];

    const samples = downsample(merged, sourceRate, TARGET_SAMPLE_RATE);
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i];
    const rms = Math.sqrt(sumSquares / Math.max(1, samples.length));

    return {
      wavBlob: encodeWav(samples, TARGET_SAMPLE_RATE),
      durationSec: samples.length / TARGET_SAMPLE_RATE,
      rms,
    };
  }
}
