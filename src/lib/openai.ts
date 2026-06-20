import OpenAI from 'openai';
import { TOEFLAcademicDiscussionFeedback } from './types';

// 環境変数の取得（ブラウザではNEXT_PUBLIC_を参照）
const isBrowser = typeof window !== 'undefined';
const apiKey = isBrowser ? process.env.NEXT_PUBLIC_OPENAI_API_KEY : process.env.OPENAI_API_KEY;

console.log('OpenAI API Key check:', {
  isBrowser,
  hasApiKey: !!apiKey,
  keyLength: apiKey ? apiKey.length : 0
});

// ブラウザではキー未設定でも即エラーにしない（動的import時のクラッシュを防止）
let openai: OpenAI | null = null;
if (apiKey) {
  openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
}

export default openai;
export async function generateTOEFLAcademicDiscussionModelAnswer(
  stance: 'agree' | 'disagree',
  essayText: string,
  discussionContent: {
    professor: string;
    student1: string;
    student2: string;
    question: string;
    professorName?: string;
    student1Name?: string;
    student2Name?: string;
  }
): Promise<string> {
  const agreeTemplate = `必須の高得点エッセイ例の作成: 学生の提出されたエッセイと、問題に書いてある他の2人の学生の意見を基にして、学生のエッセイをさらに強化するために必要な改善点を取り入れた高得点を獲得するためのエッセイ例を英語で提供します。このエッセイ例では、他の2人の学生の意見を、積極的に取り入れ、それらを論理的かつ有効に組み合わせることで、学生自身の主張を補強し、より説得力のあるエッセイを作成する方法を示します。この時に、必ず以下の文章を参考にし、同じ分量、同じ形式で、そして**で囲まれた部分を必ず使ってください。
**The topic of** economic development and environmental protection **has generated considerable discussion in recent times.**

**I strongly believe that** economic growth should not be sacrificed entirely for environmental preservation. **This is because** creating jobs and ensuring that people can provide for their families is crucial for a stable society. **For example,** industries that might cause pollution can still contribute positively to the economy as long as their activities are monitored by environmental agencies to reduce harm.

**I fully endorse** Paul’s **perspective on** this topic, **and I would like to append.** Industries provide essential employment opportunities, and simply halting their activities could have serious consequences for many families who depend on those jobs. 

**Which is why I believe a holistic approach is essential** to ensure we can balance economic growth while still protecting the environment through sustainable practices and responsible regulation.`;

  const disagreeTemplate = `必須の高得点エッセイ例: 学生のエッセイと、提出された写真に含まれる他の2人の学生の意見を基にして、学生のエッセイをさらに強化するために必要な改善点を取り入れた高得点を獲得するためのエッセイ例を英語で提供します。このエッセイ例では、他の2人の学生の意見を、積極的に取り入れ、それらを論理的かつ有効に組み合わせることで、学生自身の主張を補強し、より説得力のあるエッセイを作成する方法を示します。この時に、必ず以下の文章を参考にし、同じ分量、同じ形式で、そして**で囲まれた部分を必ず使ってください。
**The topic of** population distribution **has generated considerable discussion in recent times.**

 **I strongly believe that** incentives alone are not enough to attract more people to live in rural areas. **This is because** long-term viability and quality of life are really important. **For example**, even if it’s cheaper to live in rural areas, without adequate services, amenities, and opportunities, residents may still leave. 

**While I comprehend** Claire's **apprehension regarding** financial help to farmers, **I contend that** she **neglects the critical point** of comprehensive rural development. 

Simply giving financial support does not address the need for infrastructure, healthcare, education, and leisure activities. Sustainable development and improved quality of life are key, **which is why I believe a holistic approach is essential** to make rural areas more appealing.`;

  const system = `You are an expert TOEFL Academic Discussion writer. Generate a high-scoring model answer in English, integrating and referencing the two students' points constructively to reinforce the writer's stance. Match the template's style, order, and quantity. Use the bold-marked phrases exactly as written and KEEP the Markdown bold markers (**) in the final output. Strictly limit the output to at most 120 words.`;

  const profName = discussionContent.professorName || 'Professor';
  const s1Name = discussionContent.student1Name || 'Student 1';
  const s2Name = discussionContent.student2Name || 'Student 2';

  const user = `Context for the model answer:
Professor question: ${discussionContent.question}
Professor (${profName}): ${discussionContent.professor}
${s1Name}: ${discussionContent.student1}
${s2Name}: ${discussionContent.student2}

Student submission (for reference, to improve upon):
${essayText}

Template to follow strictly (${stance} version):
${stance === 'agree' ? agreeTemplate : disagreeTemplate}

Output requirements:
- Just the model answer text in English, no extra commentary.
- Reference ${profName}, ${s1Name}, and ${s2Name} appropriately when integrating their points.
- Maximum 120 words.
- Preserve bold phrases exactly as in the template, including the ** markers.`;

  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }
  const completion = await (openai as OpenAI).chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.7,
    max_tokens: 800
  });

  const content = (completion.choices[0]?.message?.content || '').trim();

  // Remove ** markers from the output while preserving the text
  const cleanedContent = content.replace(/\*\*/g, '');

  // Post-trim to 120 words to be safe
  const words = cleanedContent.split(/\s+/).filter(Boolean);
  if (words.length <= 120) return cleanedContent;
  const trimmed = words.slice(0, 120).join(' ');
  // Ensure a graceful ending
  return /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.';
}

// エッセイの語数を概算するユーティリティ（IELTS基準では空白区切りの単語数が一般的）
function countWords(text: string): number {
  if (!text) return 0;
  // 改行・複数スペース・タブを単一スペースとして扱い、英数字を含むトークンを単語としてカウント
  const tokens = text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  return tokens.length;
}

export interface EssayFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  detailedScores: {
    integration: number;
    organization: number;
    language: number;
    development: number;
  };
  topicDevelopment: {
    goodPoints: string[];
    improvements: string[];
  };
  generalDescription: {
    goodPoints: string[];
    improvements: string[];
  };
  specificSuggestions: {
    suggestions: string[];
  };
  grammarCorrections: {
    corrections: Array<{
      original: string;
      corrected: string;
      explanation: string;
      context: string;
      startIndex: number;
      endIndex: number;
    }>;
  };
  scaledScore?: number;
  score?: number;
}

export interface IELTSEssayFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  detailedScores: {
    taskAchievement?: number;
    taskResponse?: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammaticalRange: number;
  };
  topicDevelopment: {
    goodPoints: string[];
    improvements: string[];
  };
  generalDescription: {
    goodPoints: string[];
    improvements: string[];
  };
  specificSuggestions: {
    suggestions: Array<{
      title: string;
      description: string;
      implementation: string;
      example: string;
      reasoning: string;
    }>;
  };
  grammarCorrections: {
    corrections: Array<{
      original: string;
      corrected: string;
      explanation: string;
      context: string;
      startIndex: number;
      endIndex: number;
    }>;
  };
  scaledScore?: number;
  score?: number;
  wordCount?: number;
}

export async function getGrammarCorrections(essayText: string): Promise<EssayFeedback['grammarCorrections']> {
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  const prompt = `
以下の英文エッセイの文法誤りを特定し、修正案を提示してください。
各誤りについて、以下の情報を含めてください：
- 誤りのある原文（誤りのある単語やフレーズのみ）
- 修正後の文章（修正後の単語やフレーズのみ）
- 誤りの説明（日本語で、親しみやすい口調で説明してください）
- 誤りを含む文全体（文脈を正確に特定するため）

説明文の注意点：
- 日本語で説明してください
- 親しみやすい口調（タメ口）を使用してください
- 句点は全て「！」を使用してください
- 修正の理由を分かりやすく説明してください
- 例：「主語が複数形なので、動詞も複数形の 'talk' を使うべきだよ！」

【エッセイ本文】
${essayText}

出力は以下のJSON形式で返してください：
{
  "corrections": [
    {
      "original": "誤りのある原文",
      "corrected": "修正後の文章",
      "explanation": "日本語での説明",
      "fullSentence": "誤りを含む文全体"
    }
  ]
}
`;

  const client = openai as unknown as OpenAI; // narrow after runtime check
  const completion = await client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  if (!response) throw new Error('No response from OpenAI');
  
  const parsedResponse = JSON.parse(response);
  
  const correctionsWithPositions = [];
  let lastIndex = 0;

  for (const correction of parsedResponse.corrections) {
    // 正規化関数
    const normalize = (str: string) => str.replace(/[.,]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

    // 検索用
    const normEssay = normalize(essayText);
    const normOriginal = normalize(correction.original);

    // 検索開始位置
    const searchFrom = normEssay.indexOf(normOriginal, lastIndex);

    if (searchFrom === -1) {
      // fallback: 本文全体からoriginalを探す
      correctionsWithPositions.push({
        ...correction,
        context: correction.fullSentence,
        startIndex: 0,
        endIndex: 0
      });
      continue;
    }

    // 正規化前の本文で、originalが何回目に出てくるかをカウント
    const before = normEssay.slice(0, searchFrom);
    const count = (before.match(new RegExp(normOriginal, 'g')) || []).length;

    // 元の本文でoriginalがcount+1回目に出てくる位置を探す
    let from = 0;
    let idx = -1;
    for (let i = 0; i <= count; i++) {
      idx = essayText.indexOf(correction.original, from);
      if (idx === -1) break;
      from = idx + correction.original.length;
    }

    if (idx !== -1) {
      correctionsWithPositions.push({
        ...correction,
        context: correction.fullSentence,
        startIndex: idx,
        endIndex: idx + correction.original.length
      });
      lastIndex = searchFrom + normOriginal.length;
    } else {
      correctionsWithPositions.push({
        ...correction,
        context: correction.fullSentence,
        startIndex: 0,
        endIndex: 0
      });
    }
  }

  return { corrections: correctionsWithPositions };
}

// Rubric Mean から Scaled Score への換算表
const rubricToScaledScore: { mean: number; score: number }[] = [
  { mean: 5.00, score: 30 },
  { mean: 4.75, score: 29 },
  { mean: 4.50, score: 28 },
  { mean: 4.25, score: 27 },
  { mean: 4.00, score: 25 },
  { mean: 3.75, score: 24 },
  { mean: 3.50, score: 22 },
  { mean: 3.25, score: 21 },
  { mean: 3.00, score: 20 },
  { mean: 2.75, score: 18 },
  { mean: 2.50, score: 17 },
  { mean: 2.25, score: 15 },
  { mean: 2.00, score: 14 },
  { mean: 1.75, score: 12 },
  { mean: 1.50, score: 11 },
  { mean: 1.25, score: 10 },
  { mean: 1.00, score: 8 },
  { mean: 0.75, score: 7 },
  { mean: 0.50, score: 5 },
  { mean: 0.25, score: 4 },
  { mean: 0.00, score: 0 },
];

function getScaledScoreFromMean(mean: number): number {
  // mean以下で最大のスコアを返す（表の値は0.25刻みなので）
  for (const entry of rubricToScaledScore) {
    if (mean >= entry.mean) {
      return entry.score;
    }
  }
  return 0;
}

export async function analyzeEssay(
  essayText: string,
  readingPassage: string,
  listeningPassage: string
): Promise<EssayFeedback> {
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  const prompt = `
以下のTOEFL Writing Integrated Taskのエッセイを評価してください。
評価は以下の4つの観点で行い、それぞれ5点満点、0.25刻みで採点してください：

1. Integration (統合): リーディングとリスニングの内容を適切に統合できているか
2. Organization (構成): 論理的な構成と適切な段落分けができているか
3. Language (言語): 適切な語彙と文法が使用されているか
4. Development (展開): 主張が十分に展開され、具体例で裏付けられているか

評価は以下の形式で提供してください：

1. 全体評価（日本語で）
2. 長所（3点まで）
3. 改善点（3点まで）
4. Topic Development（主張展開）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
5. General Description（設問への回答）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
6. 新しいアイデアの具体的な提案
   - 具体的な改善案と、どこに入れるべきかも明示
7. 文法の修正
   - 空の配列でOK

フィードバックは以下の点に注意して提供してください：
- 説明は親しみやすい口調で、タメ口を使用
- 句点は全て「！」に変換
- 修正点は「→」を使用して明確に示す
- 改善案は「どこに入れるべきか」を明示

【リーディングパッセージ】
${readingPassage}

【リスニングパッセージ】
${listeningPassage}

【提出されたエッセイ】
${essayText}

評価は以下のJSON形式で返してください：
{
  "overall": "全体評価",
  "strengths": ["長所1", "長所2", "長所3"],
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "detailedScores": {
    "integration": 点数,
    "organization": 点数,
    "language": 点数,
    "development": 点数
  },
  "topicDevelopment": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "generalDescription": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "specificSuggestions": {
    "suggestions": ["提案1", "提案2"]
  },
  "grammarCorrections": {
    "corrections": []
  }
}
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsedResponse = JSON.parse(response) as EssayFeedback;

    // 平均点を計算
    const scores = parsedResponse.detailedScores;
    const mean = (scores.integration + scores.organization + scores.language + scores.development) / 4;
    const scaledScore = getScaledScoreFromMean(mean);

    // 文法添削のみ別APIで取得
    const grammarCorrections = await getGrammarCorrections(essayText);

    // 文法添削の結果を処理
    const grammarCorrectionsResult = {
      corrections: grammarCorrections?.corrections.map((correction: any) => ({
        original: correction.original,
        corrected: correction.corrected,
        explanation: correction.explanation,
        context: correction.fullSentence || correction.context || '',
        startIndex: correction.startIndex,
        endIndex: correction.endIndex
      })) || []
    };

    return {
      ...parsedResponse,
      grammarCorrections: grammarCorrectionsResult,
      scaledScore,
      score: scaledScore,
    };
  } catch (error) {
    console.error('Error analyzing essay:', error);
    throw error;
  }
}

export async function analyzeIELTSEssay(
  essayText: string,
  taskType: 'task1' | 'task2',
  taskContent: string,
  imageUrl?: string
): Promise<IELTSEssayFeedback> {
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  let prompt = '';
  const wordCount = countWords(essayText);
  
  if (taskType === 'task1') {
    // Task 1: グラフ・図表の説明
    prompt = `
以下のIELTS Writing Task 1（グラフ・図表の説明）のエッセイを評価してください。
評価は以下の4つの観点で行い、それぞれ9.0点満点、0.5刻みで採点してください（IELTSの公式スケールに準拠）：

**重要：採点は厳格に行い、9.0点は完璧なエッセイのみに与えてください。一般的な受験生は6.0-7.5点程度とし、細かいミスや改善点を見逃さないでください。**

1. Task Achievement (課題達成): グラフ・図表の主要な特徴を適切に説明できているか
2. Coherence and Cohesion (一貫性と結束性): 論理的な構成と適切な接続詞の使用
3. Lexical Resource (語彙力): 適切で多様な語彙の使用
4. Grammatical Range and Accuracy (文法の幅と正確性): 多様な文法構造と正確性

評価は以下の形式で提供してください：

1. 全体評価（日本語で）
2. 長所（3点まで）
3. 改善点（3点まで）
4. Task Achievement（課題達成）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
5. Coherence and Cohesion（一貫性と結束性）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
6. 新しいアイデアの具体的な提案
   - **具体的で実践的な改善案を3-4つ提案し、それぞれについて「どこに入れるべきか」「どのように実装するか」「なぜ効果的なのか」を詳しく説明してください**
   - 提案は具体的な文章例や表現を含めてください
7. 文法の修正
   - 空の配列でOK

フィードバックは以下の点に注意して提供してください：
- 説明は親しみやすい口調で、タメ口を使用
- 句点は全て「！」を使用
- 修正点は「→」を使用して明確に示す
- 改善案は「どこに入れるべきか」を明示
- グラフ・図表の主要な特徴（trends, comparisons, key figures）の説明が適切かも評価
- **採点は厳格に行い、改善の余地がある点は積極的に指摘してください**
- 受験者の実際の英文やフレーズを短く引用して根拠を示す（例："increase dramatically" のように二重引用符で囲む）
- 改善点には必ず「修正前 → 修正後」を1文で提示し、置き換えが明確になるようにする（例："There have an increase" → "There has been an increase"）
- 語彙・表現の提案は、置換対象の原文を引用し、自然な代替表現を1〜3個まで提示する

【タスク内容】
${taskContent}

【提出されたエッセイ】
${essayText}

【メタ情報】
- 語数（自動計測）: ${wordCount}
- 規定: 150語未満の場合、Task Achievementは大幅減点（上限5.0程度）

評価は以下のJSON形式で返してください：
{
  "overall": "全体評価",
  "strengths": ["長所1", "長所2", "長所3"],
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "detailedScores": {
    "taskAchievement": 点数,
    "coherenceCohesion": 点数,
    "lexicalResource": 点数,
    "grammaticalRange": 点数
  },
  "topicDevelopment": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "generalDescription": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "specificSuggestions": {
    "suggestions": ["提案1", "提案2"]
  },
  "grammarCorrections": {
    "corrections": []
  }
}
`;
  } else {
    // Task 2: エッセイ
    prompt = `
あなたはIELTSの試験官です。以下のIELTS Academic Writing Task 2のエッセイを、公式の **IELTS Writing Band Descriptors（公開版）** に厳密に基づいて評価してください。  

採点ルール:
- 評価は以下の4つの観点ごとに行ってください。  
  1. Task Response（課題への回答）  
     - 設問に直接的かつ十分に答えているか  
     - 主張が明確か、根拠・例示が適切か  
     - 論点が十分に展開されているか、反対意見への配慮があるか  
     - 語数が250語未満の場合は、自動的にTask Responseを大きく減点してください（通常は最大でも5.0点程度まで）。  

  2. Coherence and Cohesion（一貫性と結束性）  
     - 論理の流れが自然か、段落分けが適切か  
     - 接続詞や代名詞などのコヒージョンが正しく使われているか  
     - 文章が無理なく読めるか（アイデアのジャンプや重複がないか）  
     - 機械的・過剰な接続詞使用は減点対象にしてください。  

  3. Lexical Resource（語彙力）  
     - 適切で多様な語彙を使えているか  
     - 言い換え表現や学術的な表現の幅があるか  
     - 語法の誤りや不自然なコロケーションがある場合は減点してください。  

  4. Grammatical Range and Accuracy（文法の幅と正確性）  
     - 複雑な文構造を適切に使えているか  
     - 文法の誤りが意味に影響していないか  
     - 単純な文型だけに依存していないか  

- 各観点は0.0～9.0点の範囲で、0.5刻みで採点してください。  
- 厳格に採点すること:  
  - 9.0点はほぼ完全無欠な場合にのみ与えてください。  
  - 実際の受験生は多くの場合5.5～7.0に収まるので、甘めの採点は避けてください。  
  - 小さな文法・語彙の誤りや論理的な弱点も必ず減点対象にしてください。  
- 提示されたエッセイの内容だけを根拠に判断し、推測や好意的解釈は避けてください。  

評価は以下の形式で提供してください：

1. 全体評価（日本語で）
2. 長所（3点まで）
3. 改善点（3点まで）
4. Task Response（課題への回答）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
5. Coherence and Cohesion（一貫性と結束性）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
6. 新しいアイデアの具体的な提案
   - **具体的で実践的な改善案を3-4つ提案し、それぞれについて「どこに入れるべきか」「どのように実装するか」「なぜ効果的なのか」を詳しく説明してください**
   - 提案は具体的な文章例や表現を含めてください
7. 文法の修正
   - 空の配列でOK

フィードバックは以下の点に注意して提供してください：
- 説明は親しみやすい口調で、タメ口を使用
- 句点は全て「！」を使用
- 修正点は「→」を使用して明確に示す
- 改善案は「どこに入れるべきか」を明示
- 論点の展開、具体例の提示、反対意見への対応なども評価
- **採点は厳格に行い、改善の余地がある点は積極的に指摘してください**
- 受験者の実際の英文やフレーズを短く引用して根拠を示す（例："people is prefer" のように二重引用符で囲む）
- 改善点には必ず「修正前 → 修正後」を1文で提示し、置き換えが明確になるようにする（例："people is prefer" → "people prefer"）
- 語彙・表現の提案は、置換対象の原文を引用し、自然な代替表現を1〜3個まで提示する

【タスク内容】
${taskContent}

【提出されたエッセイ】
${essayText}

【メタ情報】
- 語数（自動計測）: ${wordCount}
- 規定: 250語未満の場合、Task Responseは大幅減点（上限5.0程度）

評価は以下のJSON形式で返してください：
{
  "overall": "全体評価",
  "strengths": ["長所1", "長所2", "長所3"],
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "detailedScores": {
    "taskResponse": 点数,
    "coherenceCohesion": 点数,
    "lexicalResource": 点数,
    "grammaticalRange": 点数
  },
  "topicDevelopment": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "generalDescription": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "specificSuggestions": {
    "suggestions": ["提案1", "提案2"]
  },
  "grammarCorrections": {
    "corrections": []
  }
}
`;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // 念のため: JSONが壊れて返るケースに備えて安全にパース
    const tryParse = (text: string) => {
      try {
        return JSON.parse(text);
      } catch (_) {
        return null;
      }
    };
    let parsedResponse = tryParse(response) as IELTSEssayFeedback | null;
    if (!parsedResponse) {
      // 最初の { から最後の } までを抽出して再トライ（大きめのJSONに対応）
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = response.slice(start, end + 1);
        parsedResponse = tryParse(candidate) as IELTSEssayFeedback | null;
      }
    }
    if (!parsedResponse) {
      console.error('Invalid JSON from OpenAI (IELTS):', response.slice(0, 1000));
      throw new Error('Failed to parse IELTS feedback JSON');
    }

    // suggestions（特にIELTS Task2）はモデルがオブジェクトで返す場合があるため、UIで扱いやすい文字列に正規化
    try {
      const rawSuggestions = (parsedResponse as any)?.specificSuggestions?.suggestions ?? [];
      const normalizedSuggestions = (Array.isArray(rawSuggestions) ? rawSuggestions : [rawSuggestions]).map((s: any) => {
        if (typeof s === 'string') return s;
        if (!s || typeof s !== 'object') return '';
        const parts = [
          s.suggestion || s.title,
          s.implementation,
          s.whereToInclude,
          s.effectiveness || s.reasoning,
          s.example,
        ].filter(Boolean);
        return parts.join(' / ');
      }).filter((t: string) => t && typeof t === 'string');
      (parsedResponse as any).specificSuggestions = {
        suggestions: normalizedSuggestions,
      };
    } catch (_) {
      // 失敗しても致命的ではないため無視
    }

    // IELTSは既に9.0満点なので、平均点をそのまま使用
    const scores = parsedResponse.detailedScores;
    let mean = 0;
    
    if (taskType === 'task1') {
      // 150語未満の場合、Task Achievementを最大5.0に制限
      const taskAchievementScore = Math.min(scores.taskAchievement || 0, wordCount < 150 ? 5.0 : 9.0);
      (parsedResponse.detailedScores as any).taskAchievement = taskAchievementScore;
      mean = (taskAchievementScore + scores.coherenceCohesion + scores.lexicalResource + scores.grammaticalRange) / 4;
    } else {
      // 250語未満の場合、Task Responseを最大5.0に制限
      const taskResponseScore = Math.min(scores.taskResponse || 0, wordCount < 250 ? 5.0 : 9.0);
      // scoresへの反映（返却オブジェクトにも反映されるように上書き）
      (parsedResponse.detailedScores as any).taskResponse = taskResponseScore;
      mean = (taskResponseScore + scores.coherenceCohesion + scores.lexicalResource + scores.grammaticalRange) / 4;
    }
    
    // IELTSは9.0満点なので、スケール変換は不要
    const scaledScore = Math.round(mean * 2) / 2; // 0.5刻みに丸める

    // 文法添削のみ別APIで取得
    const grammarCorrections = await getGrammarCorrections(essayText);

    // 文法添削の結果を処理
    const grammarCorrectionsResult = {
      corrections: grammarCorrections?.corrections.map((correction: any) => ({
        original: correction.original,
        corrected: correction.corrected,
        explanation: correction.explanation,
        context: correction.fullSentence || correction.context || '',
        startIndex: correction.startIndex,
        endIndex: correction.endIndex
      })) || []
    };

    return {
      ...parsedResponse,
      grammarCorrections: grammarCorrectionsResult,
      scaledScore,
      score: scaledScore,
      wordCount,
    };
  } catch (error) {
    console.error('Error analyzing IELTS essay:', error);
    throw error;
  }
}

export async function migrateGrammarCorrections() {
  // Implementation of the migration function
} 

export interface BasicEssayFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  grammarCorrections: {
    corrections: Array<{
      original: string;
      corrected: string;
      explanation: string;
      context: string;
      startIndex: number;
      endIndex: number;
    }>;
  };
  suggestions: string[];
}

// Basicトレーニング用のエッセイ分析
export async function analyzeBasicEssay(essayText: string, prompt: string): Promise<BasicEssayFeedback> {
  try {
    console.log('Analyzing basic essay with prompt:', prompt);
    
    const systemPrompt = `あなたは英語の専門教師です。学生のエッセイに対してフィードバックを提供してください。

学生は自由記述の英語エッセイを書きました。

以下の点に焦点を当てて建設的なフィードバックを提供してください：
1. 全体的な印象と主な長所
2. 改善点
3. 文法修正と説明（これが主な焦点）
4. より良いライティングのための具体的な提案

主に文法の正確性、文構造、言語使用に焦点を当ててください。励ましつつも正直に評価し、可能な限りテキストから具体的な例を提供してください。
さらに、可能な限り細かく添削してください。見落としを避け、同じ文でも複数の観点（語彙、語順、冠詞、前置詞、時制、一致、句読点など）から指摘してください。

**重要：すべてのフィードバックは日本語で提供してください。親しみやすい口調（タメ口）を使用し、句点は「！」を使用してください。**`;

    const userPrompt = `以下のエッセイを分析してフィードバックを提供してください：

エッセイ：
${essayText}

以下のJSON形式でフィードバックを提供してください：
{
  "overall": "エッセイの全体的な印象",
  "strengths": ["長所1", "長所2", "長所3"],
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "grammarCorrections": {
    "corrections": [
      {
        "original": "誤りのある原文",
        "corrected": "修正後の文章",
        "explanation": "修正の説明（日本語で、親しみやすい口調で）",
        "context": "周辺の文脈",
        "startIndex": 0,
        "endIndex": 0
      }
    ]
  },
  "suggestions": ["提案1", "提案2", "提案3"]
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('Raw OpenAI response:', content);

    try {
      const feedback = JSON.parse(content);
      // Normalize grammarCorrections shape if the model returned an array instead of { corrections: [...] }
      if (Array.isArray((feedback as any).grammarCorrections)) {
        (feedback as any).grammarCorrections = { corrections: (feedback as any).grammarCorrections };
      }
      if (!(feedback as any).grammarCorrections || !(feedback as any).grammarCorrections.corrections) {
        (feedback as any).grammarCorrections = { corrections: [] };
      }
      return feedback;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw content that failed to parse:', content);
      
      // フォールバック: 構造化されたフィードバックを手動で作成
      return {
        overall: "Your essay shows good effort. Here are some areas for improvement.",
        strengths: ["Good attempt at the topic", "Clear structure"],
        improvements: ["Grammar accuracy", "Vocabulary variety", "Sentence structure"],
        grammarCorrections: {
          corrections: []
        },
        suggestions: ["Practice grammar rules", "Expand vocabulary", "Read more English texts"]
      };
    }
  } catch (error) {
    console.error('Error in analyzeBasicEssay:', error);
    throw error;
  }
}

export async function analyzeTOEFLAcademicDiscussion(
  essayText: string,
  discussionContent: {
    professor: string;
    student1: string;
    student2: string;
    question: string;
  }
): Promise<TOEFLAcademicDiscussionFeedback> {
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  const prompt = `
以下のTOEFL Academic Discussionのエッセイを評価してください。
評価は以下の4つの観点で行い、それぞれ5点満点、0.25刻みで採点してください：

1. Topic Development (トピック展開): ディスカッションの内容を理解し、適切に応答できているか
   - 2.5点以上: 教授と学生の意見を完全に理解し、建設的で具体的な応答ができている
   - 2.0-2.25点: 基本的な理解はあるが、応答が表面的または不十分
   - 1.5-1.75点: 理解に問題があり、応答が不適切
   - 1.0点以下: ディスカッションの内容を理解できていない

2. Language Use (言語使用): 適切で多様な語彙と文法が使用されているか
   - 2.5点以上: 高度な語彙と複雑な文法構造を正確に使用
   - 2.0-2.25点: 基本的な語彙と文法は適切だが、多様性に欠ける
   - 1.5-1.75点: 語彙と文法に問題があり、意味に影響
   - 1.0点以下: 基本的な語彙と文法の使用に重大な問題

3. Organization (構成): 論理的な構成と適切な段落分けができているか
   - 2.5点以上: 明確な論理構造と効果的な段落構成
   - 2.0-2.25点: 基本的な構成はあるが、論理の流れに問題
   - 1.5-1.75点: 構成に問題があり、読みにくい
   - 1.0点以下: 論理的な構成ができていない

4. Development (展開): 主張が十分に展開され、具体例で裏付けられているか
   - 2.5点以上: 豊富な具体例と詳細な説明で主張を完全に展開
   - 2.0-2.25点: 基本的な展開はあるが、具体例が不十分
   - 1.5-1.75点: 展開が不十分で、具体例が少ない
   - 1.0点以下: 主張の展開ができていない

評価は以下の形式で提供してください：

1. 全体評価（日本語で）
2. 長所（3点まで）
3. 改善点（3点まで）
4. Topic Development（トピック展開）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
5. Language Use（言語使用）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
6. Organization（構成）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
7. Development（展開）の評価
   - 良い点
   - 改善点（具体的な改善案と、どこに入れるべきかも明示）
8. 新しいアイデアの具体的な提案
   - 具体的で実践的な改善案を3-4つ提案し、それぞれについて「どこに入れるべきか」「どのように実装するか」「なぜ効果的なのか」を詳しく説明してください
   - 提案は具体的な文章例や表現を含めてください
9. 文法の修正
   - 空の配列でOK

フィードバックは以下の点に注意して提供してください：
- 説明は親しみやすい口調で、タメ口を使用
- 句点は全て「！」を使用
- 修正点は「→」を使用して明確に示す
- 改善案は「どこに入れるべきか」を明示
- ディスカッションの内容を適切に理解し、それに対する建設的な応答ができているかも評価
- 教授や他の学生の意見を踏まえた議論ができているかも評価
- **採点は非常に厳格に行い、改善の余地がある点は積極的に指摘してください**
- **2.5点以上は例外的に良い場合のみ与え、通常は2.0-2.25点程度に留めてください**
- **完璧に近いレベルでない限り、3.0点以上は与えないでください**

**重要：文字数制限によるスコアキャップ**
- 提出されたエッセイが85ワード以下の場合、以下のスコアは最大2.0点に制限されます：
  - Topic Development（トピック展開）
  - Organization（構成）
  - Development（展開）
- Language Use（言語使用）は文字数に関係なく通常通り採点してください
- 85ワード以下の場合、上記3つの観点では内容が不十分であることを明確に指摘してください

**厳格な採点基準**
- 各項目で2.5点以上を与える場合は、以下の条件をすべて満たしている必要があります：
  - 明確で具体的な内容が含まれている
  - 論理的な構成と適切な展開がなされている
  - 十分な詳細と具体例が提供されている
  - 明らかな改善の余地がない
- 一般的な受験生のレベルを考慮し、甘い採点は避けてください
- 小さな問題や改善点があれば積極的に減点してください
- 2.5点以上は「非常に良い」レベル、3.0点以上は「優秀」レベルとして厳格に評価してください

【ディスカッション内容】
教授: ${discussionContent.professor}

学生1: ${discussionContent.student1}

学生2: ${discussionContent.student2}

質問: ${discussionContent.question}

【提出されたエッセイ】
${essayText}

【文字数情報】
エッセイの文字数: ${essayText.split(/\s+/).filter(Boolean).length}ワード
※85ワード以下の場合、Topic Development、Organization、Developmentは最大2.0点に制限

評価は以下のJSON形式で返してください：
{
  "overall": "全体評価",
  "strengths": ["長所1", "長所2", "長所3"],
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "detailedScores": {
    "topicDevelopment": 点数,
    "languageUse": 点数,
    "organization": 点数,
    "development": 点数
  },
  "topicDevelopment": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "languageUse": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "organization": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "development": {
    "goodPoints": ["良い点1", "良い点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "specificSuggestions": {
    "suggestions": ["提案1", "提案2", "提案3", "提案4"]
  },
  "grammarCorrections": {
    "corrections": []
  }
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたはTOEFL Academic Discussionの専門評価者です。エッセイを4つの観点から厳格に評価し、建設的なフィードバックを提供してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 5000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // JSON形式のレスポンスをパース
    const parsed = JSON.parse(content) as TOEFLAcademicDiscussionFeedback;
    
    // スコアの妥当性をチェック
    const scores = parsed.detailedScores;
    const validScores = Object.values(scores).every(score => 
      typeof score === 'number' && score >= 0 && score <= 5
    );
    
    if (!validScores) {
      throw new Error('Invalid scores received from OpenAI');
    }

    // 文法添削を統一プロンプト/構造で取得
    const grammarCorrections = await getGrammarCorrections(essayText);
    const grammarCorrectionsResult = {
      corrections: grammarCorrections?.corrections.map((correction: any) => ({
        original: correction.original,
        corrected: correction.corrected,
        explanation: correction.explanation,
        context: correction.fullSentence || correction.context || '',
        startIndex: correction.startIndex,
        endIndex: correction.endIndex
      })) || []
    };

    // 4つの観点の平均を計算して30点満点にスケール
    const mean = (
      parsed.detailedScores.topicDevelopment +
      parsed.detailedScores.languageUse +
      parsed.detailedScores.organization +
      parsed.detailedScores.development
    ) / 4;
    const scaledScore = getScaledScoreFromMean(mean);

    return Object.assign({}, parsed, {
      score: scaledScore,
      grammarCorrections: grammarCorrectionsResult,
    }) as TOEFLAcademicDiscussionFeedback & { score: number } as any;
  } catch (error) {
    console.error('Error analyzing TOEFL Academic Discussion essay:', error);
    throw error;
  }
} 