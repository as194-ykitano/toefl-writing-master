import { NextResponse } from "next/server";
import OpenAI from "openai";

// 演習結果画面の AI チャット（EG admin Practice Training の chat-article 相当）
// JSON: { context, messages: [{role, content}] }
//   context: 本文/スクリプト + 設問・正解・解説などの学習コンテキスト

export const maxDuration = 60;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    if (!openai) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }
    const { context = "", messages = [] } = (await request.json()) as {
      context?: string;
      messages?: ChatMessage[];
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは「KAI」という名前の、English Gym の TOEFL / IELTS 学習コーチ AI です。
学習者が解き終えた問題について質問してきます。以下の学習コンテキスト（本文・設問・正解・解説）に基づいて、日本語でKAIとしてわかりやすく答えてください。
学習者が【選択した本文】を添えて質問した場合は、その該当箇所を最優先で解説してください。
- 本文からの引用は英語のまま示し、日本語で解説する
- 語彙の質問には、意味・品詞・例文・言い換えを添える
- 「なぜこの答えになるのか」には、本文の根拠箇所を引用して説明する
- 学習者を励ましつつ、簡潔に（長くても 300 語程度）

[学習コンテキスト]
${String(context).slice(0, 24000)}
[コンテキストここまで]`,
        },
        ...messages.slice(-12).map((m) => ({
          role: m.role,
          content: String(m.content).slice(0, 4000),
        })),
      ],
      temperature: 0.5,
      max_tokens: 900,
    });

    return NextResponse.json({ message: completion.choices[0]?.message?.content ?? "" });
  } catch (error) {
    console.error("Error in prep-chat:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to chat", message }, { status: 500 });
  }
}
