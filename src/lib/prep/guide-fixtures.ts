import { LISTENING_SETS, READING_SETS, SPEAKING_SETS } from "./mock-data";
import type { ExamId, ListeningSet, PracticeQuestion, PracticeSessionResult, ReadingSet, SpeakingSet, WritingResult } from "./types";

const writingSample = `I believe universities should provide both quiet study areas and reservable group rooms. Quiet spaces help students concentrate on reading and difficult individual work, while group rooms support discussion and collaborative assignments. For example, students preparing a presentation can compare evidence and rehearse without disturbing other learners. Offering both types of space therefore allows students to choose the environment that best matches each task.`;

function answerFor(question: PracticeQuestion, index: number): string | string[] {
  if (index !== 1) return question.answer;
  if (Array.isArray(question.answer)) return ["Incorrect sample answer"];
  return question.options?.find((option) => option !== question.answer) ?? "Incorrect sample answer";
}

export function getGuidePracticeSession(id: string): {
  session: PracticeSessionResult;
  set: (typeof READING_SETS)[number] | (typeof LISTENING_SETS)[number] | SpeakingSet;
} | null {
  const match = /^guide-(toefl|ielts)-(reading|listening|speaking)$/.exec(id);
  if (!match) return null;
  const exam = match[1] as ExamId;
  const skill = match[2] as "reading" | "listening" | "speaking";
  const set = skill === "reading"
    ? READING_SETS.find((item) => item.exam === exam)
    : skill === "listening"
      ? LISTENING_SETS.find((item) => item.exam === exam)
      : SPEAKING_SETS.find((item) => item.exam === exam);
  if (!set) return null;
  if (skill === "speaking") {
    const speaking = { ...(set as SpeakingSet), practiceType: exam === "ielts" ? "part-1" : (set as SpeakingSet).practiceType };
    const feedback = speaking.tasks.slice(0, 2).map((task, index) => ({
      taskId: task.id,
      transcript: index === 0
        ? "I prefer studying in the morning because I can concentrate before my day becomes busy. This routine help me begin with a clear goal."
        : "Working with classmates are useful because we can compare ideas and explain difficult concepts to one another.",
      bandEstimate: exam === "ielts" ? 6.5 : 4.5,
      summary: "質問に直接答え、理由と具体例を加えられています。",
      strengths: ["主張が明確です。", "理由から具体例への流れが自然です。"],
      improvements: ["結論を一文加えると回答が締まります。", "同じ語の繰り返しを言い換えましょう。"],
      improvedVersion: "I prefer studying in the morning because I can focus before the day gets busy. Reviewing after breakfast also helps me set a clear goal for the day.",
      grammarCorrections: index === 0
        ? [{ mistake: "This routine help me", correction: "This routine helps me", explanation: "主語が三人称単数なので、動詞に -s を付けます。", context: "This routine help me begin with a clear goal.", category: "主語と動詞の一致" }]
        : [{ mistake: "Working with classmates are useful", correction: "Working with classmates is useful", explanation: "動名詞句全体を単数の主語として扱います。", context: "Working with classmates are useful because we can compare ideas.", category: "主語と動詞の一致" }],
      fluency: { durationSec: 34, wpm: 126, articulationWpm: 148, pauseRatio: 0.12, longPauses: 1, fillerCount: 1, wordRepetitionCount: 0, phraseRestartCount: 0, selfCorrectionCount: 1, startDelaySec: 1.2 },
    }));
    return { set: speaking, session: { id, exam, skill, setId: speaking.id, setTitle: speaking.title, practiceType: speaking.practiceType, mode: "practice", finishedAt: "2026-07-14T09:30:00.000Z", durationSec: 286, correctCount: 0, totalCount: speaking.tasks.length, results: speaking.tasks.map((task) => ({ questionId: task.id, userAnswer: null, correct: true })), speakingFeedback: feedback } };
  }
  const objectiveSet = set as ReadingSet | ListeningSet;
  const questions = objectiveSet.questions;
  const results = questions.map((question, index) => {
    const userAnswer = answerFor(question, index);
    return { questionId: question.id, userAnswer, correct: index !== 1 };
  });
  return { set: objectiveSet, session: { id, exam, skill, setId: objectiveSet.id, setTitle: objectiveSet.title, practiceType: objectiveSet.practiceType, mode: "practice", finishedAt: "2026-07-14T09:30:00.000Z", durationSec: skill === "reading" ? 742 : 516, correctCount: results.filter((item) => item.correct).length, totalCount: results.length, results } };
}

export function getGuideWritingResult(id: string): WritingResult | null {
  const match = /^guide-(toefl|ielts)-writing$/.exec(id);
  if (!match) return null;
  const exam = match[1] as "toefl" | "ielts";
  const max = exam === "ielts" ? 9 : 5;
  return {
    id,
    exam,
    setId: exam === "ielts" ? "ielts-w-iU1xczS1I1xdZUbsruHE" : "toefl-w-QQVgxo8u3HRLVOx1xWdJ",
    mode: "practice",
    practiceType: exam === "ielts" ? "task-1" : "academic-discussion",
    rubric: exam === "ielts" ? "ielts-task1" : "toefl-academic-discussion",
    title: exam === "ielts" ? "IELTS Writing Task 1 — Sample Feedback" : "TOEFL Academic Discussion — Sample Feedback",
    content: writingSample,
    wordCount: 65,
    durationSec: 548,
    finishedAt: "2026-07-14T09:30:00.000Z",
    feedback: {
      overall: "設問に直接答え、二つの学習環境を比較しながら一貫した主張を展開できています。次は結論をより具体的にし、語彙の重複を減らしましょう。",
      strengths: ["冒頭で立場が明確です。", "具体例が主張を効果的に支えています。"],
      improvements: ["最後に要点を言い換えた結論を加えましょう。", "students と spaces の繰り返しを言い換えましょう。"],
      scoreItems: exam === "ielts"
        ? [{ label: "Task Achievement", score: 7, max }, { label: "Coherence and Cohesion", score: 6.5, max }, { label: "Lexical Resource", score: 6.5, max }, { label: "Grammar", score: 7, max }]
        : [{ label: "内容・展開", score: 4, max }, { label: "構成", score: 4, max }, { label: "語彙・文法", score: 4, max }],
      score: exam === "ielts" ? 6.5 : 4,
      scoreMax: max,
      scoreLabel: exam === "ielts" ? "推定 Band" : "推定スコア",
      topicDevelopment: { goodPoints: ["理由と例が対応しています。"], improvements: ["反対側との比較をもう一文加えると説得力が増します。"] },
      generalDescription: { goodPoints: ["段落全体の流れが明快です。"], improvements: ["結論を独立した一文にしましょう。"] },
      specificSuggestions: [{ title: "結論を強化する", description: "二種類のスペースが補完関係にあることを最後にまとめます。", example: "For these reasons, universities should offer both environments rather than prioritize only one." }],
      grammarCorrections: [{
        original: "support discussion",
        corrected: "support discussions",
        explanation: "一般的な複数回の話し合いを表すため、複数形が自然です。",
        context: "group rooms support discussion and collaborative assignments",
        startIndex: writingSample.indexOf("support discussion"),
        endIndex: writingSample.indexOf("support discussion") + "support discussion".length,
        category: "名詞の単数・複数",
      }],
      improvedVersion: `${writingSample}\n\nFor these reasons, universities should maintain both environments so that learners can select the space that best supports each activity.`,
      sampleAnswer: `${writingSample}\n\nFor these reasons, a balanced campus should include both silent and collaborative learning spaces.`,
    },
  };
}
