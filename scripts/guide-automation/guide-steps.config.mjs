const step = (key, title, description, image, highlightKey, extras = {}) => ({
  key,
  title,
  description,
  image,
  highlightKey,
  ...extras,
});

const imageStep = (key, title, description, image, details = []) =>
  step(key, title, description, image, undefined, { staticImage: true, details });

const listSteps = (guideId, exam, skill) => [
  step(
    "choose-type",
    "Homeで問題タイプを選ぶ",
    `${exam} ${skill}を選ぶと、Home下部に利用できる問題タイプが表示されます。取り組みたいカードを選んで演習一覧へ進みます。`,
    `${guideId}/01-home-types.png`,
    "home-type",
  ),
  step(
    "practice-mode",
    "練習モードを開く",
    "練習モードでは、時間を気にせず問題の形式と解き方を確認できます。初めての問題タイプは練習モードから始めます。",
    `${guideId}/02-practice-list.png`,
    "practice",
  ),
  step(
    "test-mode",
    "本番モードで時間を測る",
    "形式に慣れたら本番モードを使います。制限時間と未回答問題を確認しながら、実際の試験に近い流れで解きます。",
    `${guideId}/02-practice-list.png`,
    "test",
  ),
];

const readingExercise = (guideId) => [
  step("read-passage", "本文を読む", "左側の本文を読み、段落番号と設問で指定された箇所を照合します。", `${guideId}/03-exercise.png`, "passage"),
  step("answer-question", "設問と選択肢に回答する", "右側で設問と回答条件を確認して回答します。", `${guideId}/03-exercise.png`, "question"),
  step("flag-question", "迷った問題をあとで見直す", "確信がない問題は「あとで見直す」を付け、最後に戻ります。", `${guideId}/03-exercise.png`, "flag"),
  step("navigate-submit", "問題を移動して提出する", "下部の問題番号で未回答とフラグを確認してから提出します。", `${guideId}/03-exercise.png`, "navigation"),
];

const listeningExercise = (guideId) => [
  step("play-audio", "音声を再生する", "音声プレイヤーから問題音声を再生します。再生回数などの条件も画面内で確認します。", `${guideId}/03-exercise.png`, "audio"),
  step("take-notes", "聞きながらメモを取る", "固有名詞、数字、話者の意見など、解答に必要な情報をメモ欄へ短く残します。", `${guideId}/03-exercise.png`, "notes"),
  step("answer-listening", "設問へ回答する", "音声の要点を思い出しながら、右側の設問へ回答します。", `${guideId}/03-exercise.png`, "question"),
  step("navigate-listening", "未回答を確認して提出する", "問題番号を使って未回答や見直し対象へ移動し、最後に提出します。", `${guideId}/03-exercise.png`, "navigation"),
];

const objectiveFeedback = (guideId, skill, hasKai = false) => imageStep(
  "feedback-overview",
  "結果・解説画面の見方",
  "提出後に開く実際の結果ページです。最初に全体像を確認し、その後は下へスクロールして復習します。",
  `${guideId}/04-feedback-top.png`,
  [
    "ページ上部で正答率、正答数、所要時間を確認します。",
    skill === "Listening" ? "音声、スクリプト、日本語訳を見比べ、聞き取れなかった箇所を確認します。" : "本文と日本語訳を見比べ、読み違えた段落を確認します。",
    "各設問で、自分の回答・正解・日本語解説を確認します。正解だけでなく、他の選択肢が不正解になる理由まで読みます。",
    ...(hasKai ? ["TOEFL Readingでは、本文を選択してKAIへ追加質問できます。"] : []),
  ],
);

const speakingSteps = (guideId, exam) => [
  ...listSteps(guideId, exam, "Speaking").slice(0, 2),
  step("speaking-settings", "録音時間と問題表示を設定する", "録音時間と、問題文を最初から表示するかを選びます。", `${guideId}/03-settings.png`, "settings"),
  step("confirm-settings", "設定を確定して問題へ進む", "「この設定で始める」を押して実際の質問画面へ進みます。", `${guideId}/03-settings.png`, "begin"),
  step("understand-speaking-screen", "質問・準備時間・回答時間を確認する", "質問とタイマーを確認し、短く構成を考えてから録音します。", `${guideId}/04-exercise.png`, "task"),
  step("start-recording", "録音を開始する", "開始ボタンを押すと準備または録音が始まります。終了後に提出するとAIフィードバックが作成されます。", `${guideId}/04-exercise.png`, "start"),
  imageStep(
    "speaking-feedback",
    "Speakingフィードバック画面の見方",
    "実際のフィードバックページを開いた直後の画面です。縦横比を変えず、そのまま掲載しています。",
    `${guideId}/05-feedback-top.png`,
    [
      exam === "IELTS" ? "上部で推定Bandと回答済みタスク数を確認します。" : "上部で推定スコアと回答済みタスク数を確認します。",
      "タスクごとに質問、文字起こし、発話速度、無音、フィラー、言い直しを確認します。",
      "良かった点と改善ポイントを読み、改善版と自分の回答を声に出して比較します。",
      "ページ下部のエラー修正ドリルでは、文字起こし中の文法・語法ミスを自分で修正できます。",
    ],
  ),
  imageStep(
    "speaking-grammar-drill",
    "エラー修正ドリルで文法を直す",
    "文字起こしに含まれる誤りを、答えを見る前に自分で入力して直します。",
    `${guideId}/06-grammar-drill.png`,
    ["誤りを含む文とエラーの種類を確認します。", "修正文を入力して判定し、解説と正しい形を確認します。"],
  ),
];

const writingSteps = (guideId, exam) => {
  const toefl = exam === "TOEFL";
  return [
    ...listSteps(guideId, exam, "Writing").slice(0, 2),
    step("read-writing-prompt", toefl ? "教授の設問を読む" : "問題文と条件を読む", "設問、最低語数、制限時間などの条件を確認します。", `${guideId}/03-exercise.png`, "prompt"),
    ...(toefl ? [step("compare-student-responses", "他の学生の回答と自分の立場を確認する", "Student Responsesを読み、自分の立場と重ならない理由や例を考えます。", `${guideId}/03-exercise.png`, "responses")] : []),
    step("write-and-submit", "回答を入力し、語数を確認して提出する", "英語で回答を入力し、語数と内容を確認して提出します。", `${guideId}/03-exercise.png`, "response"),
    imageStep(
      "writing-feedback",
      "Writingフィードバック画面の見方",
      "実際の添削ページを開いた直後の画面です。縦横比を変えず、そのまま掲載しています。",
      `${guideId}/04-feedback-top.png`,
      [
        toefl ? "上部で推定スコアと内容・構成・語彙文法の観点別評価を確認します。" : "上部で推定BandとTask Achievement、Coherence、Lexical Resource、Grammarを確認します。",
        "提出した回答では、ハイライトへカーソルを合わせるとエラーの種類を確認できます。",
        "良かった点・改善点・具体的な提案から、次に直す項目を1つ選びます。",
        "改善版と元の答案を比較し、構成・接続表現・具体例の違いを次の答案へ応用します。",
      ],
    ),
    imageStep(
      "writing-grammar-drill",
      "エラー修正ドリルで文法を直す",
      "答案中の文法・語法ミスを、正解を見る前にタイピングして修正します。",
      `${guideId}/05-grammar-drill.png`,
      ["ハイライトされた誤りとエラー分類を確認します。", "修正文を入力して判定し、解説を読んで同じミスを防ぎます。"],
    ),
  ];
};

export const guideSteps = {
  "getting-started": [
    step("switch-exam", "対策する試験を切り替える", "左上の試験名からTOEFL・IELTS・TOEICを切り替えます。", "getting-started/01-home.png", "exam-switcher"),
    step("set-goal", "1日の目標学習時間を設定する", "Homeの目標カードから、毎日の目標時間を設定します。", "getting-started/01-home.png", "daily-goal"),
    step("choose-skill", "技能を選んで問題タイプを表示する", "Reading・Listening・Speaking・Writingから技能を選ぶと、その下に問題タイプが表示されます。", "getting-started/01-home.png", "skill-card"),
  ],
  "toefl-reading": [...listSteps("toefl-reading", "TOEFL", "Reading"), ...readingExercise("toefl-reading"), objectiveFeedback("toefl-reading", "Reading", true)],
  "toefl-listening": [...listSteps("toefl-listening", "TOEFL", "Listening"), ...listeningExercise("toefl-listening"), objectiveFeedback("toefl-listening", "Listening")],
  "toefl-speaking": speakingSteps("toefl-speaking", "TOEFL"),
  "toefl-writing": writingSteps("toefl-writing", "TOEFL"),
  "ielts-reading": [...listSteps("ielts-reading", "IELTS Academic", "Reading"), ...readingExercise("ielts-reading"), objectiveFeedback("ielts-reading", "Reading")],
  "ielts-listening": [...listSteps("ielts-listening", "IELTS Academic", "Listening"), ...listeningExercise("ielts-listening"), objectiveFeedback("ielts-listening", "Listening")],
  "ielts-speaking": speakingSteps("ielts-speaking", "IELTS"),
  "ielts-writing": writingSteps("ielts-writing", "IELTS"),
  "toeic-reading": [
    ...listSteps("toeic-reading", "TOEIC", "Reading"),
    step("answer-toeic", "設問と選択肢へ回答する", "Part 5では空所の前後を読み、品詞・文法・意味から回答します。", "toeic-reading/03-exercise.png", "question"),
    step("flag-toeic", "迷った問題へフラグを付ける", "迷った問題はフラグを付けて最後に戻ります。", "toeic-reading/03-exercise.png", "flag"),
    step("navigate-toeic", "問題番号と時間を確認して提出する", "未回答とフラグを確認し、時間内に提出します。", "toeic-reading/03-exercise.png", "navigation"),
  ],
  "toeic-listening": [{ key: "coming-soon", title: "Coming Soon", description: "TOEIC Listeningの演習とガイドは現在準備中です。", comingSoon: true }],
  "mock-tests": [{ key: "coming-soon", title: "Coming Soon", description: "模試機能は現在準備中です。", comingSoon: true }],
  "learning-data": [
    step("study-mode", "技能別・問題タイプ別を切り替える", "学習時間を技能別または問題タイプ別に集計できます。", "learning-data/01-study-time.png", "mode"),
    step("study-chart", "週次グラフで学習量を確認する", "曜日ごとの学習時間と週合計を確認します。", "learning-data/01-study-time.png", "chart"),
    step("study-table", "内訳表で正確な時間を見る", "グラフ下の表で技能別・日別の時間を確認します。", "learning-data/01-study-time.png", "table"),
    step("history-filter", "学習履歴を技能で絞り込む", "技能フィルターから見たい履歴だけを表示します。", "learning-data/02-history.png", "filters"),
    step("history-open", "履歴から結果・添削を開く", "履歴を選ぶと、受講時と同じ結果・フィードバックページを開けます。", "learning-data/02-history.png", "list"),
    step("overview-period", "データ推移の集計期間を選ぶ", "7日・30日・90日・全期間を切り替えます。※以下のデータ推移画像は、見やすいIELTS Academic Readingの表示例をTOEFL・IELTS・TOEIC共通の説明として掲載しています。", "learning-data/03-overview.png", "period"),
    step("overview-skill", "技能を切り替える", "Readingなどの技能カードを選びます。※画像はIELTS Academic Readingの表示例です。", "learning-data/03-overview.png", "skills"),
    step("overview-chart", "スコア推移グラフを読む", "複数回のスコア変化から、直近の伸びと長期傾向を確認します。※画像はIELTS Academic Readingの表示例です。", "learning-data/03-overview.png", "chart"),
    step("overview-types", "問題タイプ別の得意・苦手を見る", "問題タイプ別の平均と回数を比較し、優先して復習する形式を決めます。※画像はIELTS Academic Readingの表示例です。", "learning-data/03-overview.png", "types"),
  ],
  "video-courses": [
    step("search-course", "コースを検索する", "コース名や説明から目的のコースを検索します。", "video-courses/01-course-list.png", "search"),
    step("open-course", "コースカードを開く", "サムネイル、レッスン数、進捗率を確認してコースを開きます。", "video-courses/01-course-list.png", "card"),
    step("watch-lesson", "レッスン動画を開く", "実際の /video-courses/コースID/lessons/レッスンID 画面です。動画の下にはタイトルとレッスン概要が表示されます。", "video-courses/02-lesson.png", "video"),
    step("lesson-list", "モジュールとレッスンを移動する", "右側のLessonsからモジュールとレッスンを確認し、別のレッスンへ移動できます。", "video-courses/02-lesson.png", "sidebar"),
    step("complete-lesson", "「完了にする」を押す", "動画を見終えたら「完了にする」を押します。進捗率と完了レッスン数へ反映され、チェックマークが付きます。", "video-courses/02-lesson.png", "complete"),
  ],
};
