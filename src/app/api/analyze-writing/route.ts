import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  analyzeIELTSEssay,
  analyzeTOEFLAcademicDiscussion,
  generateTOEFLAcademicDiscussionModelAnswer,
  getGrammarCorrectionsV2,
} from "@/lib/openai";
import type {
  DiscussionContent,
  WritingFeedback,
  WritingGrammarCorrection,
  WritingRubricKind,
} from "@/lib/prep/types";

// 新 Writing 系の統合 AI 添削 API
// 旧 Writing Masters 版（openai.ts）の添削ロジックを再利用し、
// 新仕様の WritingFeedback 形式へ正規化して返す。
//
// リクエスト JSON:
//   { rubric, essayText, promptText?, taskContent?, discussion?, to?, subject? }

export const maxDuration = 60;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface AnalyzeRequest {
  rubric: WritingRubricKind;
  essayText: string;
  promptText?: string;
  taskContent?: string;
  discussion?: DiscussionContent;
  to?: string;
  subject?: string;
  /** Academic Discussion: 立場（モデル解答生成に使用） */
  stance?: "agree" | "disagree";
}

function round025(v: number): number {
  return Math.round(v * 4) / 4;
}

function normalizeGrammar(
  corrections: WritingGrammarCorrection[] | undefined
): WritingGrammarCorrection[] {
  return (corrections ?? []).map((c) => ({
    original: c.original,
    corrected: c.corrected,
    explanation: c.explanation,
    context: c.context ?? "",
    startIndex: c.startIndex ?? 0,
    endIndex: c.endIndex ?? 0,
  }));
}

// ---- IELTS Task 1 / Task 2 ----
async function analyzeIelts(
  essayText: string,
  taskType: "task1" | "task2",
  taskContent: string
): Promise<WritingFeedback> {
  const fb = await analyzeIELTSEssay(essayText, taskType, taskContent);
  const s = fb.detailedScores;
  const scoreItems =
    taskType === "task1"
      ? [
          { label: "Task Achievement", score: s.taskAchievement ?? 0, max: 9 },
          { label: "Coherence & Cohesion", score: s.coherenceCohesion, max: 9 },
          { label: "Lexical Resource", score: s.lexicalResource, max: 9 },
          { label: "Grammatical Range", score: s.grammaticalRange, max: 9 },
        ]
      : [
          { label: "Task Response", score: s.taskResponse ?? 0, max: 9 },
          { label: "Coherence & Cohesion", score: s.coherenceCohesion, max: 9 },
          { label: "Lexical Resource", score: s.lexicalResource, max: 9 },
          { label: "Grammatical Range", score: s.grammaticalRange, max: 9 },
        ];
  return {
    overall: fb.overall,
    strengths: fb.strengths ?? [],
    improvements: fb.improvements ?? [],
    scoreItems,
    score: fb.scaledScore ?? fb.score ?? 0,
    scoreMax: 9,
    scoreLabel: "推定 Band",
    topicDevelopment: fb.topicDevelopment,
    generalDescription: fb.generalDescription,
    specificSuggestions: fb.specificSuggestions?.suggestions ?? [],
    grammarCorrections: normalizeGrammar(fb.grammarCorrections?.corrections),
  };
}

// ---- TOEFL Academic Discussion ----
async function analyzeDiscussion(
  essayText: string,
  discussion: DiscussionContent,
  stance?: "agree" | "disagree"
): Promise<WritingFeedback> {
  const fb = await analyzeTOEFLAcademicDiscussion(essayText, {
    professor: discussion.professor,
    student1: discussion.student1,
    student2: discussion.student2,
    question: discussion.question,
  });
  // 選択した立場（Agree / Disagree）に沿ったモデル解答を生成し、解答例として提示
  let modelAnswer: string | undefined;
  if (stance) {
    try {
      modelAnswer = await generateTOEFLAcademicDiscussionModelAnswer(stance, essayText, {
        professor: discussion.professor,
        student1: discussion.student1,
        student2: discussion.student2,
        question: discussion.question,
        professorName: discussion.professorName,
        student1Name: discussion.student1Name,
        student2Name: discussion.student2Name,
      });
    } catch {
      modelAnswer = undefined;
    }
  }
  const s = fb.detailedScores;
  const scoreItems = [
    { label: "Topic Development", score: s.topicDevelopment, max: 5 },
    { label: "Language Use", score: s.languageUse, max: 5 },
    { label: "Organization", score: s.organization, max: 5 },
    { label: "Development", score: s.development, max: 5 },
  ];
  const mean =
    (s.topicDevelopment + s.languageUse + s.organization + s.development) / 4;
  // Language Use / Organization / Development を General Description にまとめる
  const generalDescription = {
    goodPoints: [
      ...(fb.languageUse?.goodPoints ?? []),
      ...(fb.organization?.goodPoints ?? []),
      ...(fb.development?.goodPoints ?? []),
    ],
    improvements: [
      ...(fb.languageUse?.improvements ?? []),
      ...(fb.organization?.improvements ?? []),
      ...(fb.development?.improvements ?? []),
    ],
  };
  return {
    overall: fb.overall,
    strengths: fb.strengths ?? [],
    improvements: fb.improvements ?? [],
    scoreItems,
    score: round025(mean),
    scoreMax: 5,
    scoreLabel: "推定スコア",
    topicDevelopment: fb.topicDevelopment,
    generalDescription,
    specificSuggestions: fb.specificSuggestions?.suggestions ?? [],
    grammarCorrections: normalizeGrammar(
      fb.grammarCorrections?.corrections as WritingGrammarCorrection[] | undefined
    ),
    sampleAnswer: modelAnswer,
  };
}

// ---- TOEFL Write an Email（旧版より深い添削へ強化） ----
async function analyzeEmail(
  essayText: string,
  promptText: string,
  to: string,
  subject: string
): Promise<WritingFeedback> {
  if (!openai) throw new Error("OPENAI_API_KEY is not configured");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `あなたは新形式 TOEFL iBT Writing（Write an Email タスク）の厳しめの採点官です。
受験者のメールを評価し、日本語で具体的なフィードバックを返します。
評価観点は次の4つで、それぞれ 0.0〜5.0（0.25刻み）で採点してください。
1. Task Fulfillment（3つの要件を満たしているか）
2. Organization（構成と一貫性）
3. Language Use（語彙・文法の正確さ）
4. Tone（メールとして適切な丁寧さ・トーン）

出力ルール:
- "overall"、"strengths"、"improvements"、"requirementsCheck" はすべて自然な日本語で書く。
- コメントは抽象論で終わらせず、必ずメール中の具体的な英語表現を短く引用しながら説明する。
- "improvements" では、どう直すかの具体的な英語の言い換え例を含める。
- "improvedVersion" は受験者の内容を活かして1ランク上に改善した英語のメール全文。
- JSON 以外は一切出力しない。

次の JSON 形式で返す:
{
  "overall": "全体講評（2〜3文、日本語）",
  "detailedScores": { "taskFulfillment": 3.5, "organization": 3.5, "languageUse": 3.0, "tone": 4.0 },
  "requirementsCheck": ["要件ごとの達成状況（要件の数だけ）"],
  "strengths": ["良かった点（最大3つ）"],
  "improvements": ["改善点（具体的な英語の言い換え例つき、最大3つ）"],
  "improvedVersion": "改善版メール全文（英語）"
}`,
      },
      {
        role: "user",
        content: `【タスク】\n${promptText}\n\n【宛先】${to || "-"} / 【件名】${
          subject || "-"
        }\n\n【受験者のメール】\n${essayText}`,
      },
    ],
  });

  let parsed: {
    overall?: string;
    detailedScores?: {
      taskFulfillment?: number;
      organization?: number;
      languageUse?: number;
      tone?: number;
    };
    requirementsCheck?: string[];
    strengths?: string[];
    improvements?: string[];
    improvedVersion?: string;
  } = {};
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    parsed = { overall: completion.choices[0]?.message?.content ?? "" };
  }

  const ds = parsed.detailedScores ?? {};
  const scoreItems = [
    { label: "Task Fulfillment", score: ds.taskFulfillment ?? 0, max: 5 },
    { label: "Organization", score: ds.organization ?? 0, max: 5 },
    { label: "Language Use", score: ds.languageUse ?? 0, max: 5 },
    { label: "Tone", score: ds.tone ?? 0, max: 5 },
  ];
  const mean =
    scoreItems.reduce((acc, it) => acc + it.score, 0) / scoreItems.length;

  // 文法添削は旧版と同じ getGrammarCorrectionsV2 を再利用（インデックス付き）
  const grammar = await getGrammarCorrectionsV2(essayText);

  return {
    overall: parsed.overall ?? "",
    strengths: parsed.strengths ?? [],
    improvements: parsed.improvements ?? [],
    scoreItems,
    score: round025(mean),
    scoreMax: 5,
    scoreLabel: "推定スコア",
    requirementsCheck: parsed.requirementsCheck ?? [],
    improvedVersion: parsed.improvedVersion,
    specificSuggestions: [],
    grammarCorrections: normalizeGrammar(
      grammar?.corrections as WritingGrammarCorrection[] | undefined
    ),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { rubric, essayText } = body;

    if (!essayText || typeof essayText !== "string" || essayText.trim().length === 0) {
      return NextResponse.json({ error: "essayText is required" }, { status: 400 });
    }

    let feedback: WritingFeedback;
    switch (rubric) {
      case "ielts-task1":
        feedback = await analyzeIelts(essayText, "task1", body.taskContent ?? body.promptText ?? "");
        break;
      case "ielts-task2":
        feedback = await analyzeIelts(essayText, "task2", body.taskContent ?? body.promptText ?? "");
        break;
      case "toefl-academic-discussion":
        if (!body.discussion) {
          return NextResponse.json({ error: "discussion is required" }, { status: 400 });
        }
        feedback = await analyzeDiscussion(essayText, body.discussion, body.stance);
        break;
      case "toefl-email":
        feedback = await analyzeEmail(
          essayText,
          body.promptText ?? "",
          body.to ?? "",
          body.subject ?? ""
        );
        break;
      default:
        return NextResponse.json({ error: `Unknown rubric: ${rubric}` }, { status: 400 });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Error analyzing writing:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to analyze writing", message }, { status: 500 });
  }
}
