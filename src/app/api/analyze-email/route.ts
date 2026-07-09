import { NextResponse } from "next/server";
import OpenAI from "openai";

// TOEFL Write an Email の AI 添削
// JSON: { promptText, emailText, to, subject }

export const maxDuration = 60;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }
    const { promptText, emailText, to, subject } = await request.json();
    if (!emailText || typeof emailText !== "string" || emailText.trim().length === 0) {
      return NextResponse.json({ error: "emailText is required" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `あなたは新形式 TOEFL iBT Writing（Write an Email タスク）の採点官です。
受験者のメールを評価し、日本語でフィードバックを返します。
評価観点: タスク達成度（3 つの要件を満たしているか）/ 構成と一貫性 / 語彙・文法の正確さ / メールとして適切なトーン。
Band は 1〜6（0.5 刻み）で推定してください。
必ず次の JSON 形式で返してください:
{
  "bandEstimate": number,
  "summary": "全体講評（2〜3文、日本語）",
  "requirementsCheck": ["要件ごとの達成状況（日本語、要件の数だけ）"],
  "strengths": ["良かった点（日本語、最大3つ）"],
  "improvements": ["改善点（日本語で指摘し、具体的な英語の言い換え例を含める。最大3つ）"],
  "improvedVersion": "受験者の内容を活かして 1 ランク上に改善した英語のメール全文"
}`,
        },
        {
          role: "user",
          content: `【タスク】\n${promptText ?? ""}\n\n【宛先】${to ?? "-"} / 【件名】${subject ?? "-"}\n\n【受験者のメール】\n${emailText}`,
        },
      ],
      temperature: 0.4,
    });

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    } catch {
      analysis = {
        summary: completion.choices[0]?.message?.content ?? "フィードバックの解析に失敗しました。",
      };
    }
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error analyzing email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to analyze email", message }, { status: 500 });
  }
}
