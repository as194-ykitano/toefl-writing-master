// モック問題データ
// 実データ投入時はこのファイルの中身を差し替えるか、
// data-source.ts の取得先を Firestore / API に切り替える

import {
  DashboardSnapshot,
  ListeningSet,
  MockReport,
  ReadingSet,
  SpeakingSet,
  StudyPlan,
} from "./types";

// ---------------- Reading ----------------

export const READING_SETS: ReadingSet[] = [
  {
    id: "toefl-reading-01",
    exam: "toefl",
    skill: "reading",
    title: "Reading Practice 1: The Rise of Urban Farming",
    passageTitle: "The Rise of Urban Farming",
    difficulty: "medium",
    timeLimitSec: 18 * 60,
    paragraphs: [
      {
        text: "Over the past two decades, urban farming has moved from the margins of city life to a recognized component of municipal planning. Rooftop gardens, vertical farms, and converted vacant lots now supply fresh produce to neighborhoods that once depended entirely on food transported over long distances. Advocates argue that these farms shorten supply chains, reduce spoilage, and reconnect city residents with the process of food production.",
      },
      {
        text: "The economic case for urban farming, however, is more complicated than its supporters sometimes suggest. Land in cities is expensive, and the yield from a rooftop plot rarely competes with that of conventional farmland. Many urban farms therefore rely on premium pricing, subscription models, or public subsidies to remain viable. Critics contend that without such support, most operations would struggle to survive beyond their first few years.",
      },
      {
        text: "Technology has begun to change this calculation. Hydroponic systems, which grow plants in nutrient-rich water rather than soil, allow farmers to stack growing beds vertically and to control temperature, light, and humidity with precision. Because these systems recycle water and eliminate the need for pesticides, they can produce leafy greens using a fraction of the resources required by traditional agriculture. The initial investment remains high, but operating costs fall sharply once a facility is running.",
      },
      {
        text: "Perhaps the most significant benefits of urban farming are social rather than economic. Community gardens have been shown to strengthen neighborhood ties, provide educational opportunities for children, and improve the mental health of participants. In several cities, farming programs have also created employment pathways for residents who face barriers to traditional work. These outcomes are difficult to measure in market terms, which may explain why they are often overlooked in debates about the sector's future.",
      },
    ],
    questions: [
      {
        id: "tr1-q1",
        number: 1,
        type: "multiple_choice",
        prompt: "According to paragraph 1, what is one argument made by advocates of urban farming?",
        reference: "Paragraph 1",
        options: [
          "It shortens the distance food travels before reaching consumers.",
          "It has replaced conventional farmland in most cities.",
          "It is now the main source of produce for city residents.",
          "It eliminates the need for municipal planning.",
        ],
        answer: "It shortens the distance food travels before reaching consumers.",
        explanation:
          "第1段落に \"these farms shorten supply chains, reduce spoilage\" とあり、食料の輸送距離（サプライチェーン）を短くする点が支持者の主張として挙げられています。",
        trapNote:
          "\"recognized component of municipal planning\" という表現から選択肢4を選ばないこと。都市計画に組み込まれたのであって、不要になったのではありません。",
        skillTag: "detail",
      },
      {
        id: "tr1-q2",
        number: 2,
        type: "multiple_choice",
        prompt: "The word \"viable\" in paragraph 2 is closest in meaning to:",
        reference: "Paragraph 2",
        options: ["profitable", "able to continue operating", "popular", "environmentally friendly"],
        answer: "able to continue operating",
        explanation:
          "\"rely on premium pricing ... to remain viable\" の文脈では「事業として存続できる」という意味です。",
        trapNote: "profitable（利益が出る）は近いですが、viable はより広く「成立し続けられる」ことを指します。",
        skillTag: "vocabulary",
      },
      {
        id: "tr1-q3",
        number: 3,
        type: "multiple_choice",
        prompt: "According to paragraph 3, hydroponic systems reduce resource use because they:",
        reference: "Paragraph 3",
        options: [
          "use cheaper land than traditional farms",
          "recycle water and avoid pesticides",
          "require no initial investment",
          "grow crops more slowly",
        ],
        answer: "recycle water and avoid pesticides",
        explanation:
          "\"Because these systems recycle water and eliminate the need for pesticides\" が直接の根拠です。",
        skillTag: "detail",
      },
      {
        id: "tr1-q4",
        number: 4,
        type: "multiple_choice",
        prompt: "What can be inferred from paragraph 4 about the social benefits of urban farming?",
        reference: "Paragraph 4",
        options: [
          "They are frequently undervalued because they are hard to quantify.",
          "They are less important than the economic benefits.",
          "They occur only in wealthy neighborhoods.",
          "They have been fully measured by researchers.",
        ],
        answer: "They are frequently undervalued because they are hard to quantify.",
        explanation:
          "\"difficult to measure in market terms, which may explain why they are often overlooked\" から、定量化しにくいために過小評価されがちだと推論できます。",
        trapNote: "本文は社会的便益が「最も重要かもしれない」と述べており、経済的便益より劣るとは言っていません。",
        skillTag: "inference",
      },
      {
        id: "tr1-q5",
        number: 5,
        type: "gap_fill",
        prompt:
          "Complete the sentence with ONE word from paragraph 3: Hydroponic systems grow plants in nutrient-rich water rather than ______.",
        reference: "Paragraph 3",
        answer: "soil",
        explanation: "\"grow plants in nutrient-rich water rather than soil\" がそのまま該当します。",
        skillTag: "detail",
      },
      {
        id: "tr1-q6",
        number: 6,
        type: "multi_select",
        prompt:
          "Select TWO statements that summarize main ideas of the passage.",
        options: [
          "Urban farming faces real economic challenges despite its popularity.",
          "Technology such as hydroponics is improving the economics of urban farming.",
          "Urban farms have made conventional agriculture obsolete.",
          "Community gardens are banned in most cities.",
        ],
        answer: [
          "Urban farming faces real economic challenges despite its popularity.",
          "Technology such as hydroponics is improving the economics of urban farming.",
        ],
        explanation:
          "第2段落が経済的課題、第3段落が技術による改善を述べています。残り2つは本文と矛盾します。",
        skillTag: "main_idea",
      },
    ],
  },
  {
    id: "ielts-reading-01",
    exam: "ielts",
    skill: "reading",
    title: "Reading Practice 1: The Secret Life of Honeybees",
    passageTitle: "The Secret Life of Honeybees",
    difficulty: "medium",
    timeLimitSec: 20 * 60,
    paragraphs: [
      {
        label: "A",
        text: "Honeybees are among the most studied insects on Earth, yet researchers continue to uncover surprising details about how their colonies function. A single hive may contain fifty thousand individuals, all coordinating their activities without any central authority. Decisions about where to forage, when to swarm, and how to regulate temperature emerge from the interactions of thousands of bees, each following relatively simple rules.",
      },
      {
        label: "B",
        text: "One of the best-known examples of this coordination is the waggle dance. When a forager discovers a rich source of nectar, she returns to the hive and performs a repetitive figure-of-eight movement. The angle of the dance relative to the vertical comb communicates the direction of the food source in relation to the sun, while the duration of the central 'waggle' phase indicates the distance. Other bees follow the dancer, memorize the information, and fly out to the advertised location.",
      },
      {
        label: "C",
        text: "Temperature regulation offers another striking case. Honeybee larvae develop properly only within a narrow temperature band around thirty-five degrees Celsius. On hot days, workers fan their wings at the hive entrance and spread droplets of water to cool the interior. In cold weather, bees cluster together and vibrate their flight muscles to generate heat. Individual bees appear to respond to local temperature cues, yet the colony as a whole maintains remarkable stability.",
      },
      {
        label: "D",
        text: "Recent research has focused on how colonies make collective decisions when they reproduce by swarming. Scout bees investigate potential nest sites and report back through dances of varying intensity. Sites of higher quality provoke longer, more vigorous dances, recruiting more scouts to inspect them. When the number of scouts at one site passes a threshold, the swarm commits to it. Biologists have compared this process to the way neurons in a brain accumulate evidence before triggering a decision.",
      },
      {
        label: "E",
        text: "These findings have practical implications beyond biology. Computer scientists have borrowed principles from bee behaviour to design algorithms for routing internet traffic and allocating server capacity. Engineers studying swarm robotics likewise treat the hive as a model of how simple units can accomplish complex tasks without centralized control. The humble honeybee, it turns out, has much to teach designers of distributed systems.",
      },
    ],
    questions: [
      {
        id: "ir1-q1",
        number: 1,
        type: "matching",
        prompt: "Which paragraph contains a comparison between bee colonies and the human brain?",
        matchTargets: ["A", "B", "C", "D", "E"],
        answer: "D",
        explanation:
          "Paragraph D の \"Biologists have compared this process to the way neurons in a brain accumulate evidence\" が該当します。",
        skillTag: "scanning",
      },
      {
        id: "ir1-q2",
        number: 2,
        type: "matching",
        prompt: "Which paragraph describes applications of bee research in technology?",
        matchTargets: ["A", "B", "C", "D", "E"],
        answer: "E",
        explanation: "Paragraph E がアルゴリズムやスワームロボティクスへの応用を説明しています。",
        skillTag: "scanning",
      },
      {
        id: "ir1-q3",
        number: 3,
        type: "true_false_notgiven",
        prompt: "The waggle dance communicates both the direction and the distance of a food source.",
        options: ["TRUE", "FALSE", "NOT GIVEN"],
        answer: "TRUE",
        explanation:
          "Paragraph B に、ダンスの角度が方向を、waggle 部分の長さが距離を伝えるとあります。両方の情報が含まれるので TRUE です。",
        skillTag: "tfng",
      },
      {
        id: "ir1-q4",
        number: 4,
        type: "true_false_notgiven",
        prompt: "Honeybee larvae can develop normally in a wide range of temperatures.",
        options: ["TRUE", "FALSE", "NOT GIVEN"],
        answer: "FALSE",
        explanation:
          "Paragraph C に \"develop properly only within a narrow temperature band\" とあり、本文と正反対なので FALSE です。",
        trapNote: "「本文に温度の記述がある＝TRUE」と早合点しないこと。内容が一致するかまで確認します。",
        skillTag: "tfng",
      },
      {
        id: "ir1-q5",
        number: 5,
        type: "true_false_notgiven",
        prompt: "Scout bees are older than forager bees.",
        options: ["TRUE", "FALSE", "NOT GIVEN"],
        answer: "NOT GIVEN",
        explanation:
          "スカウトバチと採餌バチの年齢の比較は本文のどこにも書かれていないため NOT GIVEN です。",
        trapNote: "本文にない情報を常識で補って TRUE / FALSE を選ばないこと。",
        skillTag: "tfng",
      },
      {
        id: "ir1-q6",
        number: 6,
        type: "gap_fill",
        prompt:
          "Complete the sentence with NO MORE THAN TWO WORDS: When enough scouts gather at one site, the swarm passes a ______ and commits to it.",
        answer: "threshold",
        explanation: "Paragraph D の \"passes a threshold\" が根拠です。",
        skillTag: "completion",
      },
    ],
  },
];

// ---------------- Listening ----------------

export const LISTENING_SETS: ListeningSet[] = [
  {
    id: "toefl-listening-01",
    exam: "toefl",
    skill: "listening",
    title: "Listening Practice 1: Campus Conversation",
    description: "図書館のリサーチサポートに関する学生と職員の会話",
    difficulty: "easy",
    timeLimitSec: 10 * 60,
    playLimitInTest: 1,
    transcript:
      "Student: Hi, I was told the library offers help with research projects? / Librarian: That's right. We run one-on-one consultations with a research librarian. You can book a thirty-minute session online. / Student: Great. I'm working on a psychology paper about sleep and memory, but I'm having trouble finding recent studies. / Librarian: In that case I'd start with the PsycINFO database rather than a general web search. We also have a workshop on database searching this Thursday at four. / Student: Thursday is difficult — I have a lab session. Is the workshop repeated? / Librarian: Yes, the same workshop runs every two weeks, and the slides are posted on the library website afterwards. / Student: Perfect. Then I'll book a consultation for this week and catch the next workshop.",
    questions: [
      {
        id: "tl1-q1",
        number: 1,
        type: "multiple_choice",
        prompt: "Why does the student visit the library?",
        options: [
          "To get help finding sources for a research paper",
          "To return an overdue book",
          "To apply for a job at the library",
          "To attend a lab session",
        ],
        answer: "To get help finding sources for a research paper",
        explanation:
          "冒頭で \"help with research projects\" を求め、心理学のレポートの文献探しに苦労していると述べています。",
        skillTag: "main_idea",
      },
      {
        id: "tl1-q2",
        number: 2,
        type: "multiple_choice",
        prompt: "What does the librarian recommend the student use first?",
        options: ["A general web search", "The PsycINFO database", "A printed encyclopedia", "Lecture notes"],
        answer: "The PsycINFO database",
        explanation: "\"I'd start with the PsycINFO database rather than a general web search\" が根拠です。",
        trapNote: "\"rather than a general web search\" と対比されているため、選択肢1は不正解です。",
        skillTag: "detail",
      },
      {
        id: "tl1-q3",
        number: 3,
        type: "multiple_choice",
        prompt: "Why can't the student attend the workshop on Thursday?",
        options: [
          "The workshop is fully booked",
          "The student has a lab session",
          "The library is closed",
          "The workshop was cancelled",
        ],
        answer: "The student has a lab session",
        explanation: "\"Thursday is difficult — I have a lab session.\" が根拠です。",
        skillTag: "detail",
      },
      {
        id: "tl1-q4",
        number: 4,
        type: "multiple_choice",
        prompt: "What will the student probably do next?",
        options: [
          "Book a consultation and attend a later workshop",
          "Give up on the research paper",
          "Change the paper topic",
          "Ask a professor for the slides",
        ],
        answer: "Book a consultation and attend a later workshop",
        explanation:
          "最後の発言 \"I'll book a consultation for this week and catch the next workshop\" から行動を推測します。",
        skillTag: "inference",
      },
    ],
  },
  {
    id: "ielts-listening-01",
    exam: "ielts",
    skill: "listening",
    title: "Listening Practice 1: Community Centre Enquiry",
    description: "コミュニティセンターの講座申し込みに関する電話での問い合わせ",
    difficulty: "easy",
    timeLimitSec: 10 * 60,
    playLimitInTest: 1,
    transcript:
      "Receptionist: Good morning, Riverside Community Centre. / Caller: Hello, I'd like to ask about the evening pottery course. / Receptionist: Of course. The next course starts on the 14th of October and runs for eight weeks, every Tuesday from seven to nine pm. / Caller: And how much does it cost? / Receptionist: It's ninety-five pounds, which includes all materials. Students and seniors pay seventy pounds. / Caller: I'm a student, so that's good news. Do I need to bring anything? / Receptionist: Just an apron, and please wear closed shoes — that's a safety requirement in the studio. / Caller: How do I register? / Receptionist: You can register on our website, but places are limited to twelve, so I'd recommend doing it this week.",
    questions: [
      {
        id: "il1-q1",
        number: 1,
        type: "gap_fill",
        prompt: "The pottery course starts on the ______ of October.",
        answer: "14th",
        explanation: "\"starts on the 14th of October\" が根拠です。数字の聞き取りは date + ordinal に注意します。",
        skillTag: "form_completion",
      },
      {
        id: "il1-q2",
        number: 2,
        type: "gap_fill",
        prompt: "The course fee for students is £______.",
        answer: "70",
        explanation:
          "\"Students and seniors pay seventy pounds.\" が根拠です。通常料金 95 ポンドとの聞き分けがポイントです。",
        trapNote: "最初に聞こえる 95 は通常料金。話者の属性（学生）に合う金額を選びます。",
        skillTag: "form_completion",
      },
      {
        id: "il1-q3",
        number: 3,
        type: "gap_fill",
        prompt: "Participants must bring an apron and wear ______ shoes.",
        answer: "closed",
        explanation: "\"please wear closed shoes — that's a safety requirement\" が根拠です。",
        skillTag: "form_completion",
      },
      {
        id: "il1-q4",
        number: 4,
        type: "multiple_choice",
        prompt: "Why does the receptionist suggest registering this week?",
        options: [
          "Because the price will increase",
          "Because places are limited to twelve",
          "Because the website will close",
          "Because materials must be ordered",
        ],
        answer: "Because places are limited to twelve",
        explanation: "\"places are limited to twelve, so I'd recommend doing it this week\" が根拠です。",
        skillTag: "detail",
      },
    ],
  },
];

// ---------------- Speaking ----------------

export const SPEAKING_SETS: SpeakingSet[] = [
  {
    // 新形式 TOEFL Speaking: Take an Interview 形式
    // （テーマに沿った 4 つの質問に各 45 秒で回答）
    id: "toefl-speaking-01",
    exam: "toefl",
    skill: "speaking",
    title: "Take an Interview Practice 1: Student Life & Technology",
    description: "新形式のインタビュー形式。テーマに沿った 4 つの質問に各 45 秒で回答します",
    difficulty: "medium",
    tasks: [
      {
        id: "ts1-t1",
        number: 1,
        label: "Take an Interview — Question 1",
        prompt:
          "You are taking part in an interview about student life and technology. First question: How do you usually use technology in your daily studies?",
        prepSec: 10,
        speakSec: 45,
      },
      {
        id: "ts1-t2",
        number: 2,
        label: "Take an Interview — Question 2",
        prompt:
          "Do you think students learn better with printed books or with digital materials? Why?",
        prepSec: 10,
        speakSec: 45,
      },
      {
        id: "ts1-t3",
        number: 3,
        label: "Take an Interview — Question 3",
        prompt:
          "Describe a time when technology helped you solve a problem in your studies or daily life.",
        prepSec: 10,
        speakSec: 45,
      },
      {
        id: "ts1-t4",
        number: 4,
        label: "Take an Interview — Question 4",
        prompt:
          "Some people say technology makes students less focused. What do you think about this opinion?",
        prepSec: 10,
        speakSec: 45,
      },
    ],
  },
  {
    id: "ielts-speaking-01",
    exam: "ielts",
    skill: "speaking",
    title: "Speaking Practice 1: Part 1 + Part 2",
    difficulty: "medium",
    tasks: [
      {
        id: "is1-t1",
        number: 1,
        label: "Part 1: Introduction Questions",
        prompt:
          "Let's talk about your hometown. Where is your hometown, and what do you like most about living there? Has it changed much since you were a child?",
        prepSec: 5,
        speakSec: 60,
      },
      {
        id: "is1-t2",
        number: 2,
        label: "Part 2: Cue Card",
        prompt:
          "Describe a skill you learned that has been useful in your life. You should say: what the skill is, how you learned it, when you use it, and explain why it has been useful to you.",
        prepSec: 60,
        speakSec: 120,
      },
    ],
  },
];

// ---------------- サンプルレポート ----------------

export const SAMPLE_REPORTS: MockReport[] = [
  {
    id: "sample-toefl",
    exam: "toefl",
    title: "TOEFL Mini Mock Test",
    finishedAt: "2026-07-05T10:30:00+09:00",
    overallScore: 84,
    overallMax: 120,
    cefr: "B2",
    sections: [
      { skill: "reading", score: 23, maxScore: 30 },
      { skill: "listening", score: 21, maxScore: 30 },
      { skill: "speaking", score: 19, maxScore: 30 },
      { skill: "writing", score: 21, maxScore: 30 },
    ],
    correctCount: 31,
    totalCount: 42,
    durationMin: 92,
    strengths: [
      "Reading の語彙問題は全問正解 — アカデミック語彙の基礎が安定しています",
      "Writing の構成（イントロ・ボディ・結論）が明確です",
    ],
    weaknesses: [
      "Listening の推論問題（話者の意図）で失点が集中しています",
      "Speaking (Take an Interview) で、回答の具体例が不足しがちです",
    ],
    nextSteps: [
      "Listening: 会話文の「言い換え表現」に注目して 1 日 1 セット演習",
      "Speaking: 「結論→理由→具体例」の型で 45 秒にまとめる練習を毎日実施",
      "Reading: 推論問題のみを集中的に復習",
    ],
    tutorComment:
      "全体として B2 上位の力があります。目標スコアに向けた最大のボトルネックは Listening の推論問題です。まず「話者がなぜその発言をしたか」を意識した精聴トレーニングを 2 週間続けましょう。Speaking は回答の型を固定すればスコアの底上げが見込めます。",
  },
  {
    id: "sample-ielts",
    exam: "ielts",
    title: "IELTS Mini Mock Test",
    finishedAt: "2026-07-03T14:00:00+09:00",
    overallScore: 6.5,
    overallMax: 9,
    cefr: "B2",
    sections: [
      { skill: "reading", score: 7.0, maxScore: 9 },
      { skill: "listening", score: 6.5, maxScore: 9 },
      { skill: "speaking", score: 6.0, maxScore: 9 },
      { skill: "writing", score: 6.0, maxScore: 9 },
    ],
    correctCount: 29,
    totalCount: 40,
    durationMin: 105,
    strengths: [
      "Reading のマッチング問題の正答率が高く、スキャニングが得意です",
      "Listening の Section 1（日常会話）はほぼ満点です",
    ],
    weaknesses: [
      "True/False/Not Given で NOT GIVEN の判定ミスが目立ちます",
      "Writing Task 1 のデータ描写で比較表現のバリエーションが不足しています",
    ],
    nextSteps: [
      "Reading: TFNG 専用練習で「本文にない情報」の見極めを強化",
      "Writing Task 1: 増減・比較の表現リストを作成して毎回使う",
      "Speaking Part 2: 2 分間話し続ける練習を録音してセルフチェック",
    ],
    tutorComment:
      "Band 7.0 まであと一歩です。伸びしろが最も大きいのは Writing と Speaking の 6.0 です。特に Writing Task 1 は型を身につければ短期間で 6.5 に到達できます。Reading の TFNG は「書かれていないことは判定しない」原則を徹底しましょう。",
  },
];

// ---------------- ダッシュボード（モック） ----------------

export const DASHBOARD_SNAPSHOT: DashboardSnapshot = {
  targetExam: "toefl",
  targetScoreLabel: "TOEFL 100",
  currentScoreLabel: "84",
  skillScores: [
    { skill: "reading", label: "Reading", score: "23 / 30", trend: "up" },
    { skill: "listening", label: "Listening", score: "21 / 30", trend: "flat" },
    { skill: "speaking", label: "Speaking", score: "19 / 30", trend: "up" },
    { skill: "writing", label: "Writing", score: "21 / 30", trend: "up" },
  ],
  todayRecommendations: [
    {
      title: "TOEFL Listening 推論問題セット",
      href: "/practice/toefl/listening",
      reason: "直近の模試で話者の意図を問う問題の正答率が 40% でした",
    },
    {
      title: "Academic Discussion 1 本提出",
      href: "/toefl-tasks",
      reason: "前回の添削から 5 日空いています",
    },
    {
      title: "間違えた問題の復習 (6 問)",
      href: "/review",
      reason: "未復習の問題が溜まっています",
    },
  ],
  recentWeaknesses: [
    "Listening: 話者の意図・態度を問う問題",
    "Reading: NOT GIVEN の判定",
    "Speaking: インタビュー回答の具体例不足",
  ],
  submissions: [
    {
      category: "toefl",
      categoryLabel: "TOEFL",
      title: "Academic Discussion: Remote Work",
      status: "添削済み",
      href: "/toefl-dashboard",
    },
    {
      category: "ielts",
      categoryLabel: "IELTS",
      title: "Writing Task 2: Public Transport",
      status: "復習待ち",
      href: "/ielts-dashboard",
    },
    {
      category: "advanced",
      categoryLabel: "Advanced",
      title: "YouTube Writing: TED Talk Summary",
      status: "AIフィードバック済み",
      href: "/youtuber-dashboard",
    },
    {
      category: "advanced",
      categoryLabel: "Advanced",
      title: "Free Writing: My Career Goals",
      status: "改善案あり",
      href: "/basic-dashboard",
    },
  ],
};

// ---------------- 学習プラン（モック） ----------------

export const STUDY_PLAN: StudyPlan = {
  targetScoreLabel: "TOEFL 100",
  currentScoreLabel: "TOEFL 84（推定）",
  gapLabel: "あと 16 点",
  weakestSkill: "speaking",
  weeklyFocus: [
    "Listening: 話者の意図を問う推論問題の正答率を 40% → 70% に",
    "Speaking: Take an Interview の回答を「結論→理由→具体例」の型で固定する",
    "Writing: Academic Discussion を週 2 本提出する",
  ],
  todayTasks: [
    { title: "TOEFL Listening 演習 1 セット（推論問題中心）", href: "/practice/toefl/listening", minutes: 20 },
    { title: "未復習の間違い 6 問を復習", href: "/review", minutes: 15 },
    { title: "Speaking Take an Interview 1 セット録音", href: "/practice/toefl/speaking", minutes: 15 },
  ],
  week: [
    {
      day: "Day 1（今日）",
      focus: "Listening 推論 + Speaking 録音",
      tasks: [
        { title: "Listening 演習 1 セット", href: "/practice/toefl/listening", minutes: 20 },
        { title: "Speaking Take an Interview 1 セット", href: "/practice/toefl/speaking", minutes: 15 },
      ],
    },
    {
      day: "Day 2",
      focus: "Reading 推論問題 + 復習",
      tasks: [
        { title: "Reading 演習 1 セット", href: "/practice/toefl/reading", minutes: 20 },
        { title: "間違い復習", href: "/review", minutes: 15 },
      ],
    },
    {
      day: "Day 3",
      focus: "Academic Discussion 提出",
      tasks: [{ title: "Academic Discussion 1 本", href: "/toefl-tasks", minutes: 30 }],
    },
    {
      day: "Day 4",
      focus: "Listening + Speaking インタビュー",
      tasks: [
        { title: "Listening 演習 1 セット", href: "/practice/toefl/listening", minutes: 20 },
        { title: "Speaking Take an Interview 1 セット", href: "/practice/toefl/speaking", minutes: 20 },
      ],
    },
    {
      day: "Day 5",
      focus: "Academic Discussion 提出",
      tasks: [{ title: "Academic Discussion 1 本", href: "/toefl-tasks", minutes: 20 }],
    },
    {
      day: "Day 6",
      focus: "弱点集中日",
      tasks: [
        { title: "今週間違えた問題を全復習", href: "/review", minutes: 30 },
        { title: "苦手タイプの追加演習", href: "/practice/toefl/listening", minutes: 20 },
      ],
    },
    {
      day: "Day 7",
      focus: "ミニ模試で計測",
      tasks: [{ title: "TOEFL Mini Mock Test", href: "/toefl", minutes: 60 }],
    },
  ],
};
