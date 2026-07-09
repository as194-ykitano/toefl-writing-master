import { NextResponse } from "next/server";
import OpenAI from "openai";

// Speaking 録音の解析:
// 1. Whisper で文字起こし
// 2. GPT で IELTS/TOEFL Speaking 基準のフィードバックを生成
//
// FormData:
//   audio    — 録音ファイル (webm/ogg/mp4)
//   prompt   — 設問文
//   exam     — "toefl" | "ielts"
//   label    — タスク種別（例: "Part 2 (Cue Card)"）

export const maxDuration = 60;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface SpeakingAnalysis {
  bandEstimate?: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  improvedVersion?: string;
}

// ---- Listen and Repeat 用の一致率採点 ----
// ETS の採点方式（各文 0〜5 点・7 問の平均がタスクスコア）に合わせ、
// Whisper 文字起こしとお手本文の語単位の一致率から項目スコアを算出する。

// 数詞 → 数字の正規化テーブル（ten ↔ 10 を一致として扱う）
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
  // 序数（"the second floor" ↔ "the 2nd floor"）
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18,
  nineteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50,
};
const SCALE_WORDS: Record<string, number> = { hundred: 100, thousand: 1000 };

/** 連続する数詞（"twenty five" / "two hundred"）を 1 つの数字トークンにまとめる */
function normalizeNumbers(tokens: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (!(token in NUMBER_WORDS)) {
      out.push(token);
      i++;
      continue;
    }
    let value = NUMBER_WORDS[token];
    let j = i + 1;
    while (j < tokens.length) {
      const next = tokens[j];
      if (next in SCALE_WORDS) {
        value = Math.max(value, 1) * SCALE_WORDS[next];
        j++;
      } else if (next === "and" && j + 1 < tokens.length && tokens[j + 1] in NUMBER_WORDS && value >= 100) {
        // "one hundred and five"
        j++;
      } else if (
        next in NUMBER_WORDS &&
        // "twenty five" のような十の位 + 一の位のみ結合（"five five" は結合しない）
        ((value % 100 === 0 && value >= 20 && NUMBER_WORDS[next] < 100) ||
          (value >= 20 && value < 100 && value % 10 === 0 && NUMBER_WORDS[next] < 10))
      ) {
        value += NUMBER_WORDS[next];
        j++;
      } else {
        break;
      }
    }
    out.push(String(value));
    i = j;
  }
  return out;
}

function tokenize(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/-/g, " ") // twenty-five → twenty five
    .split(/\s+/)
    .filter(Boolean)
    // "15th" → "15"（序数サフィックスの除去）
    .map((t) => t.replace(/^(\d+)(st|nd|rd|th)$/, "$1"));
  return normalizeNumbers(tokens);
}

/** トークン列の編集距離（Levenshtein） */
function editDistance(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function matchRatio(expected: string, actual: string): number {
  const e = tokenize(expected);
  const a = tokenize(actual);
  if (e.length === 0) return 0;
  const distance = editDistance(e, a);
  return Math.max(0, 1 - distance / Math.max(e.length, a.length));
}

/** ETS の 0〜5 ルーブリックに合わせた項目スコア
 *  5: 完全一致 / 4: 軽微なズレ（意味保持） / 2-3: 内容欠落 / 0-1: ほぼ判別不能 */
function itemScoreFromRatio(ratio: number, hasTranscript: boolean): number {
  if (!hasTranscript) return 0;
  if (ratio >= 0.98) return 5;
  if (ratio >= 0.85) return 4;
  if (ratio >= 0.65) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio >= 0.15) return 1;
  return 0;
}

export async function POST(request: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    const prompt = String(formData.get("prompt") ?? "");
    const exam = String(formData.get("exam") ?? "ielts");
    const label = String(formData.get("label") ?? "");
    // evalMode "repeat": Listen and Repeat 用（GPT 講評ではなく一致率採点）
    const evalMode = String(formData.get("evalMode") ?? "feedback");
    const expected = String(formData.get("expected") ?? "");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    // 1. 文字起こし
    //    verbose_json + 単語レベルのタイムスタンプで、ポーズ（無音）を語間ギャップから正確に計測する。
    //    フィードバックモードではフィラー語の書き起こしを促す prompt を与える
    //    （Whisper は既定で um / uh などを省略しがちなため）。
    //    Listen and Repeat はお手本文と比較するため prompt なしの素の書き起こしを使う。
    const transcription = (await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
      ...(evalMode === "repeat"
        ? {}
        : { prompt: "Umm, uh, er, ah, hmm... you know, I mean, like..." }),
    })) as unknown as {
      text?: string;
      duration?: number;
      words?: { word: string; start: number; end: number }[];
    };
    const transcript = transcription.text?.trim() ?? "";

    // 流暢性メトリクス: 単語間ギャップからポーズを計測
    const words = transcription.words ?? [];
    const totalDurationSec =
      transcription.duration ?? (words.length > 0 ? words[words.length - 1].end : 0);
    const PAUSE_MIN = 0.3; // これ以上の語間ギャップを「ポーズ」とみなす
    const LONG_PAUSE = 1.0;
    let pauseSec = 0;
    let longPauses = 0;
    if (words.length > 0 && totalDurationSec > 0) {
      const gaps: number[] = [];
      gaps.push(words[0].start); // 出だしの沈黙
      for (let i = 1; i < words.length; i++) {
        gaps.push(words[i].start - words[i - 1].end);
      }
      gaps.push(Math.max(0, totalDurationSec - words[words.length - 1].end)); // 末尾の沈黙
      for (const gap of gaps) {
        if (gap >= PAUSE_MIN) pauseSec += gap;
        if (gap >= LONG_PAUSE) longPauses += 1;
      }
    }
    const speechSec = Math.max(0, totalDurationSec - pauseSec);

    // フィラーワードの検出
    const FILLER_RE = /^(um+|uh+|er+m?|ah+|hmm+|mm+)$/i;
    const transcriptTokens = transcript
      .toLowerCase()
      .replace(/[^a-z'\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const fillerHits: string[] = transcriptTokens.filter((t) => FILLER_RE.test(t));
    // "you know" / "I mean" の口癖もカウント
    const phraseFillers =
      (transcript.toLowerCase().match(/\byou know\b/g)?.length ?? 0) +
      (transcript.toLowerCase().match(/\bi mean\b/g)?.length ?? 0);
    const fillerCount = fillerHits.length + phraseFillers;

    const wordCount = words.length > 0 ? words.length : transcriptTokens.length;
    const fluency =
      totalDurationSec > 1 && wordCount > 0
        ? {
            durationSec: Math.round(totalDurationSec * 10) / 10,
            /** 発話速度（総時間ベースの words per minute） */
            wpm: Math.round(wordCount / (totalDurationSec / 60)),
            /** 調音速度（ポーズを除いた発話時間ベースの WPM） */
            articulationWpm: speechSec > 0.5 ? Math.round(wordCount / (speechSec / 60)) : 0,
            /** 無音割合（0.3 秒以上のポーズの合計 ÷ 総時間） */
            pauseRatio: Math.round((pauseSec / totalDurationSec) * 100) / 100,
            /** 1 秒以上のポーズの回数 */
            longPauses,
            /** フィラーワード（um, uh, you know など）の回数 */
            fillerCount,
          }
        : undefined;

    // Listen and Repeat: 一致率ベースの採点のみ（GPT 講評なし）
    if (evalMode === "repeat") {
      const ratio = transcript ? matchRatio(expected, transcript) : 0;
      const itemScore = itemScoreFromRatio(ratio, transcript.length > 0);
      return NextResponse.json({
        transcript,
        expectedText: expected,
        matchRatio: ratio,
        itemScore,
        fluency,
        summary: "",
        strengths: [],
        improvements: [],
      });
    }

    if (!transcript) {
      return NextResponse.json({
        transcript: "",
        summary: "音声から発話を検出できませんでした。マイクの設定を確認して、もう一度録音してみてください。",
        strengths: [],
        improvements: [],
      });
    }

    // 2. フィードバック生成
    const isIelts = exam === "ielts";
    const scaleNote = isIelts
      ? "IELTS Speaking Band (0-9, 0.5 刻み) で bandEstimate を推定してください。"
      : "新形式 TOEFL Speaking Band (1-6, 0.5 刻み) で bandEstimate を推定してください。";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは経験豊富な ${isIelts ? "IELTS" : "TOEFL"} Speaking 試験官です。受験者の回答の文字起こしと計測済みの流暢性データを評価し、日本語でフィードバックを返します。
評価観点: Fluency and Coherence（提供される無音割合・ポーズ回数・WPM・フィラー回数の計測値を必ず考慮）/ Lexical Resource / Grammatical Range and Accuracy（発音は文字起こしからは評価できないため言及しない）。
参考: 英語話者の自然な発話速度はおよそ 120〜160 WPM。100 未満はゆっくり。長いポーズの多発・無音割合 30% 超・フィラーの多用（回答時間 30 秒あたり 3 回以上）は流暢性の減点要因。
${scaleNote}
必ず次の JSON 形式で返してください:
{
  "bandEstimate": number,
  "summary": "全体講評（2〜3文、日本語）",
  "strengths": ["良かった点（日本語、最大3つ）"],
  "improvements": ["改善点（日本語で指摘し、具体的な英語の言い換え例を含める。最大3つ）"],
  "improvedVersion": "受験者の回答内容を活かしたまま、1つ上のBandに引き上げた英語の改善例（英語）"
}`,
        },
        {
          role: "user",
          content: `【タスク】${label}\n【設問】\n${prompt}\n\n【受験者の回答（文字起こし）】\n${transcript}\n\n【流暢性の計測値】\n${
            fluency
              ? `回答時間: ${fluency.durationSec} 秒 / 発話速度: ${fluency.wpm} WPM（調音速度 ${fluency.articulationWpm} WPM）/ 無音割合: ${Math.round(fluency.pauseRatio * 100)}% / 1 秒以上のポーズ: ${fluency.longPauses} 回 / フィラー: ${fluency.fillerCount} 回`
              : "計測できませんでした"
          }`,
        },
      ],
      temperature: 0.4,
    });

    let analysis: SpeakingAnalysis;
    try {
      analysis = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    } catch {
      analysis = {
        summary: completion.choices[0]?.message?.content ?? "フィードバックの解析に失敗しました。",
        strengths: [],
        improvements: [],
      };
    }

    return NextResponse.json({ transcript, fluency, ...analysis });
  } catch (error) {
    console.error("Error analyzing speaking:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to analyze speaking", message }, { status: 500 });
  }
}
