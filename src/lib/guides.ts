import type { GuideManualStep } from "@/lib/guide-manual";

export type GuideExam = "all" | "toefl" | "ielts" | "toeic";
export type GuideSkill = "all" | "reading" | "listening" | "speaking" | "writing";
export type GuideCategory = "start" | "training" | "mock-test";

export type GuideArticle = {
  id: string;
  title: string;
  summary: string;
  exam: GuideExam;
  skill: GuideSkill;
  category: GuideCategory;
  content: string;
  steps: GuideManualStep[];
  order: number;
  isPublished: boolean;
  source: "seeded" | "custom";
  updatedAt: string | null;
};

type SeedGuide = Omit<GuideArticle, "source" | "updatedAt" | "steps">;

const commonFinish = `## 学習後に確認すること

1. 解答・提出後に結果画面を確認します。
2. 間違えた問題は解説と根拠を読み、必要ならもう一度取り組みます。
3. 学習時間・履歴・スコア推移はサイドバーの「学習時間」「学習履歴」「データ推移」から確認できます。`;

function trainingGuide(input: {
  id: string;
  title: string;
  summary: string;
  exam: Exclude<GuideExam, "all">;
  skill: Exclude<GuideSkill, "all">;
  body: string;
  order: number;
}): SeedGuide {
  return {
    ...input,
    category: "training",
    content: `# ${input.title}\n\n${input.body}\n\n${commonFinish}`,
    isPublished: true,
  };
}

export const SEEDED_GUIDES: SeedGuide[] = [
  {
    id: "getting-started",
    title: "はじめに：新しい学習画面の使い方",
    summary: "試験の切り替え、ホーム、演習開始までの基本操作を説明します。",
    exam: "all",
    skill: "all",
    category: "start",
    order: 10,
    isPublished: true,
    content: `# はじめに

Exaviaの新しい学習画面では、左上の試験切り替えから **TOEFL・IELTS・TOEIC** を選び、ホームから技能別の演習を開始します。

## 基本の流れ

1. サイドバー上部で対策する試験を選びます。
2. 「ホーム」で現在の学習状況と、次に取り組む演習を確認します。
3. Reading・Listening・Speaking・Writingのカードから演習を選びます。
4. 演習を終えたら結果と解説を確認します。

## 1日の目標学習時間

ホームの学習時間エリアから、1日の目標時間を設定できます。設定した目標に対する当日の達成状況はホームと「学習時間」で確認できます。

## 途中で画面を閉じた場合

保存済みの学習結果は「学習履歴」から確認できます。試験中は、ブラウザの戻る操作や再読み込みを避けてください。`,
  },
  trainingGuide({
    id: "toefl-reading", title: "TOEFL Reading", summary: "文章の読み方、設問への回答、解説確認の流れです。", exam: "toefl", skill: "reading", order: 100,
    body: `## 演習を始める

1. 試験を「TOEFL」に切り替え、ホームのReadingを開きます。
2. Typeごとにまとまった演習から、取り組むセットを選びます。
3. 本文と設問を読み、選択肢または指定形式で回答します。

## 画面の見方

- 本文と設問は同じ画面で確認できます。
- 制限時間がある演習では、画面上のタイマーを確認してください。
- 未回答の設問がないか、提出前に問題番号を確認します。`,
  }),
  trainingGuide({
    id: "toefl-listening", title: "TOEFL Listening", summary: "音声再生、メモ、回答と復習の流れです。", exam: "toefl", skill: "listening", order: 110,
    body: `## 演習を始める

1. 試験を「TOEFL」に切り替え、ホームのListeningを開きます。
2. 取り組む会話・講義セットを選びます。
3. 音声を聞き、設問に順番に回答します。

## 注意点

- テスト形式では音声の再生回数が制限される場合があります。
- 再生前に音量を確認し、安定した通信環境で開始してください。
- 提出後はスクリプトと解説を使い、聞き取れなかった箇所を確認します。`,
  }),
  trainingGuide({
    id: "toefl-speaking", title: "TOEFL Speaking", summary: "準備時間、録音、提出とフィードバック確認の流れです。", exam: "toefl", skill: "speaking", order: 120,
    body: `## 演習を始める

1. 試験を「TOEFL」に切り替え、ホームのSpeakingを開きます。
2. タスクを選び、問題文と準備時間を確認します。
3. マイクの利用を許可して録音し、内容を確認して提出します。

## 録音のポイント

- 開始前にマイク入力が反応するか確認してください。
- 準備時間には、主張・理由・具体例を短くメモします。
- フィードバックが生成された提出物は、結果画面または学習履歴から開けます。`,
  }),
  trainingGuide({
    id: "toefl-writing", title: "TOEFL Writing", summary: "Integrated WritingとAcademic Discussionの提出方法です。", exam: "toefl", skill: "writing", order: 130,
    body: `## 演習を始める

1. 試験を「TOEFL」に切り替え、ホームのWritingを開きます。
2. Integrated WritingまたはAcademic Discussionのセットを選びます。
3. 資料と設問を確認し、エディタに解答を入力して提出します。

## フィードバック

- 提出後はスコア、評価項目、改善点、モデル回答を確認します。
- 添削結果は「学習履歴」から再度開けます。
- 従来のWriting添削は、サイドバーの「Writing 添削（旧トップ）」から利用できます。`,
  }),
  trainingGuide({
    id: "ielts-reading", title: "IELTS Reading", summary: "問題タイプ別の回答方法と復習方法です。", exam: "ielts", skill: "reading", order: 200,
    body: `## 演習を始める

1. 試験を「IELTS」に切り替え、ホームのReadingを開きます。
2. 問題タイプごとの一覧から演習セットを選びます。
3. 指示文の語数制限を確認し、本文の根拠に基づいて回答します。

## 注意点

- TRUE / FALSE / NOT GIVENなど、問題タイプごとの回答規則を確認してください。
- Completion問題ではスペルと語数制限も採点対象です。
- 解説では正解だけでなく、本文中の根拠箇所も確認します。`,
  }),
  trainingGuide({
    id: "ielts-listening", title: "IELTS Listening", summary: "音声問題、地図・表問題、復習の流れです。", exam: "ielts", skill: "listening", order: 210,
    body: `## 演習を始める

1. 試験を「IELTS」に切り替え、ホームのListeningを開きます。
2. Partまたは問題タイプから演習を選びます。
3. 問題と図表を確認し、音声を聞きながら回答します。

## 注意点

- テスト形式では音声が1回だけ再生される場合があります。
- 語数制限、単数・複数、スペルを必ず確認してください。
- 提出後はスクリプトで正解の前後を読み、言い換え表現を確認します。`,
  }),
  trainingGuide({
    id: "ielts-speaking", title: "IELTS Speaking", summary: "Part別練習、録音、フィードバック確認の流れです。", exam: "ielts", skill: "speaking", order: 220,
    body: `## 演習を始める

1. 試験を「IELTS」に切り替え、ホームのSpeakingを開きます。
2. Part 1・2・3から練習するセットを選びます。
3. マイクを許可し、表示された質問に英語で回答して提出します。

## 練習のポイント

- Part 1は自然で簡潔に、Part 2は話の構成を意識します。
- Part 3は理由や比較を加え、回答を発展させます。
- 提出後のフィードバックから語彙・文法・流暢さの改善点を確認します。`,
  }),
  trainingGuide({
    id: "ielts-writing", title: "IELTS Writing", summary: "Task 1・Task 2の解答、提出、添削確認の流れです。", exam: "ielts", skill: "writing", order: 230,
    body: `## 演習を始める

1. 試験を「IELTS」に切り替え、ホームのWritingを開きます。
2. Task 1またはTask 2を選び、問題と図表を確認します。
3. エディタに解答を入力し、語数を確認して提出します。

## フィードバック

- Task Achievement / Response、Coherence、Lexical Resource、Grammarの評価を確認します。
- 改善点とモデル回答を見比べ、書き直しに活用してください。
- 従来の添削画面は「Writing 添削（旧トップ）」から引き続き利用できます。`,
  }),
  trainingGuide({
    id: "toeic-reading", title: "TOEIC Reading", summary: "Part別演習と時間を意識した回答方法です。", exam: "toeic", skill: "reading", order: 300,
    body: `## 演習を始める

1. 試験を「TOEIC」に切り替え、ホームのReadingを開きます。
2. Partごとの一覧から演習セットを選びます。
3. 設問と選択肢を確認し、時間配分を意識して回答します。

## 復習

- 文法問題は正解のルールと他の選択肢が不正解になる理由を確認します。
- 長文問題は、根拠が書かれている箇所と設問の言い換えを確認します。`,
  }),
  trainingGuide({
    id: "toeic-listening", title: "TOEIC Listening", summary: "TOEIC Listeningの演習は現在準備中です。", exam: "toeic", skill: "listening", order: 310,
    body: `## Coming Soon

TOEIC Listeningの演習と使い方ガイドは現在準備中です。公開後、Part 1〜4の音声再生、回答操作、スクリプトを使った復習方法をこのページへ追加します。現在はTOEIC Readingをご利用ください。`,
  }),
  {
    id: "mock-tests", title: "模試の受け方", summary: "模試の開始前確認、受験中の操作、結果確認を説明します。", exam: "all", skill: "all", category: "mock-test", order: 400, isPublished: false,
    content: `# Coming Soon

模試機能は現在準備中です。公開後、開始前の音声・マイク確認、タイマーと未回答数の見方、セクション提出、結果レポートの確認方法をこのページへ追加します。現時点では技能別トレーニングをご利用ください。`,
  },
  {
    id: "learning-data", title: "学習時間・学習履歴・データ推移", summary: "日々の学習記録とスコアの見方を説明します。", exam: "all", skill: "all", category: "start", order: 500, isPublished: true,
    content: `# 学習データの見方

## 学習時間

日・週・月ごとの学習時間をグラフと表で確認できます。ホームで設定した1日の目標時間に対する達成状況も確認できます。

## 学習履歴

完了した演習・模試・提出物が新しい順に表示されます。行を選択すると、結果やフィードバックの詳細を開けます。

## データ推移

試験・技能ごとのスコア推移や正答率を確認できます。試験切り替えと期間フィルターを使い、現在対策している試験の変化を確認してください。`,
  },
  {
    id: "video-courses", title: "動画コース（コンテンツ）", summary: "コース、モジュール、レッスンの進め方を説明します。", exam: "all", skill: "all", category: "start", order: 600, isPublished: true,
    content: `# 動画コースの使い方

1. サイドバーの「コンテンツ」を開きます。
2. 受講するコースを選び、モジュール内のレッスンを開きます。
3. 動画または教材を確認し、完了したレッスンを完了済みにします。
4. コース一覧の進捗率から、どこまで進んだか確認できます。

## 進捗が反映されない場合

同じアカウントでログインしていることを確認し、ページを再読み込みしてください。それでも反映されない場合は管理者へ連絡してください。`,
  },
];

export const GUIDE_EXAM_LABELS: Record<GuideExam, string> = { all: "共通", toefl: "TOEFL", ielts: "IELTS", toeic: "TOEIC" };
export const GUIDE_SKILL_LABELS: Record<GuideSkill, string> = { all: "全体", reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing" };
export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = { start: "共通事項", training: "トレーニング", "mock-test": "模試" };

export function getSeededGuide(id: string) {
  return SEEDED_GUIDES.find((guide) => guide.id === id);
}
