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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
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
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
      // Listen and Repeat はお手本文をヒントに与えると近い語彙で書き起こされすぎるため
      // prompt は渡さない（純粋な発話の書き起こしを得る）
    });
    const transcript = transcription.text?.trim() ?? "";

    // Listen and Repeat: 一致率ベースの採点のみ（GPT 講評なし）
    if (evalMode === "repeat") {
      const ratio = transcript ? matchRatio(expected, transcript) : 0;
      const itemScore = itemScoreFromRatio(ratio, transcript.length > 0);
      return NextResponse.json({
        transcript,
        expectedText: expected,
        matchRatio: ratio,
        itemScore,
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
          content: `あなたは経験豊富な ${isIelts ? "IELTS" : "TOEFL"} Speaking 試験官です。受験者の回答の文字起こしを評価し、日本語でフィードバックを返します。
評価観点: Fluency and Coherence / Lexical Resource / Grammatical Range and Accuracy（発音は文字起こしからは評価できないため言及しない）。
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
          content: `【タスク】${label}\n【設問】\n${prompt}\n\n【受験者の回答（文字起こし）】\n${transcript}`,
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

    return NextResponse.json({ transcript, ...analysis });
  } catch (error) {
    console.error("Error analyzing speaking:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to analyze speaking", message }, { status: 500 });
  }
}
