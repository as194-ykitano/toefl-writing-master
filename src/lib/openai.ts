import OpenAI from 'openai';
import { TOEFLAcademicDiscussionFeedback } from './types';

// 迺ｰ蠅・､画焚縺ｮ蜿門ｾ暦ｼ医ヶ繝ｩ繧ｦ繧ｶ縺ｧ縺ｯNEXT_PUBLIC_繧貞盾辣ｧ・・
const isBrowser = typeof window !== 'undefined';
const apiKey = isBrowser ? process.env.NEXT_PUBLIC_OPENAI_API_KEY : process.env.OPENAI_API_KEY;

console.log('OpenAI API Key check:', {
  isBrowser,
  hasApiKey: !!apiKey,
  keyLength: apiKey ? apiKey.length : 0
});

// 繝悶Λ繧ｦ繧ｶ縺ｧ縺ｯ繧ｭ繝ｼ譛ｪ險ｭ螳壹〒繧ょ叉繧ｨ繝ｩ繝ｼ縺ｫ縺励↑縺・ｼ亥虚逧・mport譎ゅ・繧ｯ繝ｩ繝・す繝･繧帝亟豁｢・・
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
  const agreeTemplate = `蠢・医・鬮伜ｾ礼せ繧ｨ繝・そ繧､萓九・菴懈・: 蟄ｦ逕溘・謠仙・縺輔ｌ縺溘お繝・そ繧､縺ｨ縲∝撫鬘後↓譖ｸ縺・※縺ゅｋ莉悶・2莠ｺ縺ｮ蟄ｦ逕溘・諢剰ｦ九ｒ蝓ｺ縺ｫ縺励※縲∝ｭｦ逕溘・繧ｨ繝・そ繧､繧偵＆繧峨↓蠑ｷ蛹悶☆繧九◆繧√↓蠢・ｦ√↑謾ｹ蝟・せ繧貞叙繧雁・繧後◆鬮伜ｾ礼せ繧堤佐蠕励☆繧九◆繧√・繧ｨ繝・そ繧､萓九ｒ闍ｱ隱槭〒謠蝉ｾ帙＠縺ｾ縺吶ゅ％縺ｮ繧ｨ繝・そ繧､萓九〒縺ｯ縲∽ｻ悶・2莠ｺ縺ｮ蟄ｦ逕溘・諢剰ｦ九ｒ縲∫ｩ肴･ｵ逧・↓蜿悶ｊ蜈･繧後√◎繧後ｉ繧定ｫ也炊逧・°縺､譛牙柑縺ｫ邨・∩蜷医ｏ縺帙ｋ縺薙→縺ｧ縲∝ｭｦ逕溯・霄ｫ縺ｮ荳ｻ蠑ｵ繧定｣懷ｼｷ縺励√ｈ繧願ｪｬ蠕怜鴨縺ｮ縺ゅｋ繧ｨ繝・そ繧､繧剃ｽ懈・縺吶ｋ譁ｹ豕輔ｒ遉ｺ縺励∪縺吶ゅ％縺ｮ譎ゅ↓縲∝ｿ・★莉･荳九・譁・ｫ繧貞盾閠・↓縺励∝酔縺伜・驥上∝酔縺伜ｽ｢蠑上〒縲√◎縺励※**縺ｧ蝗ｲ縺ｾ繧後◆驛ｨ蛻・ｒ蠢・★菴ｿ縺｣縺ｦ縺上□縺輔＞縲・
**The topic of** economic development and environmental protection **has generated considerable discussion in recent times.**

**I strongly believe that** economic growth should not be sacrificed entirely for environmental preservation. **This is because** creating jobs and ensuring that people can provide for their families is crucial for a stable society. **For example,** industries that might cause pollution can still contribute positively to the economy as long as their activities are monitored by environmental agencies to reduce harm.

**I fully endorse** Paul窶冱 **perspective on** this topic, **and I would like to append.** Industries provide essential employment opportunities, and simply halting their activities could have serious consequences for many families who depend on those jobs. 

**Which is why I believe a holistic approach is essential** to ensure we can balance economic growth while still protecting the environment through sustainable practices and responsible regulation.`;

  const disagreeTemplate = `蠢・医・鬮伜ｾ礼せ繧ｨ繝・そ繧､萓・ 蟄ｦ逕溘・繧ｨ繝・そ繧､縺ｨ縲∵署蜃ｺ縺輔ｌ縺溷・逵溘↓蜷ｫ縺ｾ繧後ｋ莉悶・2莠ｺ縺ｮ蟄ｦ逕溘・諢剰ｦ九ｒ蝓ｺ縺ｫ縺励※縲∝ｭｦ逕溘・繧ｨ繝・そ繧､繧偵＆繧峨↓蠑ｷ蛹悶☆繧九◆繧√↓蠢・ｦ√↑謾ｹ蝟・せ繧貞叙繧雁・繧後◆鬮伜ｾ礼せ繧堤佐蠕励☆繧九◆繧√・繧ｨ繝・そ繧､萓九ｒ闍ｱ隱槭〒謠蝉ｾ帙＠縺ｾ縺吶ゅ％縺ｮ繧ｨ繝・そ繧､萓九〒縺ｯ縲∽ｻ悶・2莠ｺ縺ｮ蟄ｦ逕溘・諢剰ｦ九ｒ縲∫ｩ肴･ｵ逧・↓蜿悶ｊ蜈･繧後√◎繧後ｉ繧定ｫ也炊逧・°縺､譛牙柑縺ｫ邨・∩蜷医ｏ縺帙ｋ縺薙→縺ｧ縲∝ｭｦ逕溯・霄ｫ縺ｮ荳ｻ蠑ｵ繧定｣懷ｼｷ縺励√ｈ繧願ｪｬ蠕怜鴨縺ｮ縺ゅｋ繧ｨ繝・そ繧､繧剃ｽ懈・縺吶ｋ譁ｹ豕輔ｒ遉ｺ縺励∪縺吶ゅ％縺ｮ譎ゅ↓縲∝ｿ・★莉･荳九・譁・ｫ繧貞盾閠・↓縺励∝酔縺伜・驥上∝酔縺伜ｽ｢蠑上〒縲√◎縺励※**縺ｧ蝗ｲ縺ｾ繧後◆驛ｨ蛻・ｒ蠢・★菴ｿ縺｣縺ｦ縺上□縺輔＞縲・
**The topic of** population distribution **has generated considerable discussion in recent times.**

 **I strongly believe that** incentives alone are not enough to attract more people to live in rural areas. **This is because** long-term viability and quality of life are really important. **For example**, even if it窶冱 cheaper to live in rural areas, without adequate services, amenities, and opportunities, residents may still leave. 

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

// 繧ｨ繝・そ繧､縺ｮ隱樊焚繧呈ｦらｮ励☆繧九Θ繝ｼ繝・ぅ繝ｪ繝・ぅ・・ELTS蝓ｺ貅悶〒縺ｯ遨ｺ逋ｽ蛹ｺ蛻・ｊ縺ｮ蜊倩ｪ樊焚縺御ｸ闊ｬ逧・ｼ・
function countWords(text: string): number {
  if (!text) return 0;
  // 謾ｹ陦後・隍・焚繧ｹ繝壹・繧ｹ繝ｻ繧ｿ繝悶ｒ蜊倅ｸ繧ｹ繝壹・繧ｹ縺ｨ縺励※謇ｱ縺・∬恭謨ｰ蟄励ｒ蜷ｫ繧繝医・繧ｯ繝ｳ繧貞腰隱槭→縺励※繧ｫ繧ｦ繝ｳ繝・
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

type GrammarCorrectionWithSentence = EssayFeedback['grammarCorrections']['corrections'][number] & {
  fullSentence?: string;
};

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

type IELTSSuggestionInput =
  | string
  | {
      suggestion?: string;
      title?: string;
      description?: string;
      implementation?: string;
      whereToInclude?: string;
      effectiveness?: string;
      reasoning?: string;
      example?: string;
    };

export async function getGrammarCorrectionsV2(essayText: string): Promise<EssayFeedback['grammarCorrections']> {
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  const prompt = `
You are an English writing tutor.
Review the student's essay and return grammar and wording corrections as JSON only.

Requirements:
- Find all meaningful grammar, spelling, article, preposition, agreement, tense, word choice, and unnatural phrasing issues.
- Do not stop after one correction. If the essay has multiple mistakes, return each mistake as a separate item.
- Return multiple corrections whenever appropriate.
- Read the essay sentence by sentence from beginning to end before deciding the final correction list.
- When the essay contains 3 or more meaningful issues, return at least 3 correction items.
- Do not merge distant issues into one item. Split them into separate corrections whenever possible.
- Keep each correction span as short and precise as possible.
- "original" must exactly match the text in the essay.
- "corrected" must be the improved replacement text.
- "explanation" must be written in natural Japanese and should briefly explain why the original English is unnatural or incorrect.
- "fullSentence" must be the full original sentence containing the mistake.
- If there are no meaningful issues, return an empty array.
- Return JSON only.

Essay:
${essayText}

Output format:
{
  "corrections": [
    {
      "original": "is go",
      "corrected": "goes",
      "explanation": "主語が三人称単数なので、動詞は goes にするのが自然です。",
      "fullSentence": "She is go to school every day."
    }
  ]
}
`;

  const client = openai as unknown as OpenAI;
  const completion = await client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  if (!response) throw new Error('No response from OpenAI');

  const parsedResponse = JSON.parse(response);
  const rawCorrections = Array.isArray(parsedResponse?.corrections) ? parsedResponse.corrections : [];

  const correctionsWithPositions = [];
  let lastIndex = 0;

  for (const correction of rawCorrections) {
    const normalize = (str: string) => str.replace(/[.,]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

    const normEssay = normalize(essayText);
    const normOriginal = normalize(correction.original);

    const searchFrom = normEssay.indexOf(normOriginal, lastIndex);

    if (searchFrom === -1) {
      correctionsWithPositions.push({
        ...correction,
        context: correction.fullSentence || '',
        startIndex: 0,
        endIndex: 0,
      });
      continue;
    }

    const before = normEssay.slice(0, searchFrom);
    const count = (before.match(new RegExp(normOriginal, 'g')) || []).length;

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
        context: correction.fullSentence || '',
        startIndex: idx,
        endIndex: idx + correction.original.length,
      });
      lastIndex = searchFrom + normOriginal.length;
    } else {
      correctionsWithPositions.push({
        ...correction,
        context: correction.fullSentence || '',
        startIndex: 0,
        endIndex: 0,
      });
    }
  }

  return { corrections: correctionsWithPositions };
}


export async function getGrammarCorrections(essayText: string): Promise<EssayFeedback['grammarCorrections']> {
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  const prompt = `
莉･荳九・闍ｱ譁・お繝・そ繧､縺ｮ譁・ｳ戊ｪ､繧翫ｒ迚ｹ螳壹＠縲∽ｿｮ豁｣譯医ｒ謠千､ｺ縺励※縺上□縺輔＞縲・
蜷・ｪ､繧翫↓縺､縺・※縲∽ｻ･荳九・諠・ｱ繧貞性繧√※縺上□縺輔＞・・
- 隱､繧翫・縺ゅｋ蜴滓枚・郁ｪ､繧翫・縺ゅｋ蜊倩ｪ槭ｄ繝輔Ξ繝ｼ繧ｺ縺ｮ縺ｿ・・
- 菫ｮ豁｣蠕後・譁・ｫ・井ｿｮ豁｣蠕後・蜊倩ｪ槭ｄ繝輔Ξ繝ｼ繧ｺ縺ｮ縺ｿ・・
- 隱､繧翫・隱ｬ譏趣ｼ域律譛ｬ隱槭〒縲∬ｦｪ縺励∩繧・☆縺・哨隱ｿ縺ｧ隱ｬ譏弱＠縺ｦ縺上□縺輔＞・・
- 隱､繧翫ｒ蜷ｫ繧譁・・菴難ｼ域枚閼医ｒ豁｣遒ｺ縺ｫ迚ｹ螳壹☆繧九◆繧・ｼ・

隱ｬ譏取枚縺ｮ豕ｨ諢冗せ・・
- 譌･譛ｬ隱槭〒隱ｬ譏弱＠縺ｦ縺上□縺輔＞
- 隕ｪ縺励∩繧・☆縺・哨隱ｿ・医ち繝｡蜿｣・峨ｒ菴ｿ逕ｨ縺励※縺上□縺輔＞
- 蜿･轤ｹ縺ｯ蜈ｨ縺ｦ縲鯉ｼ√阪ｒ菴ｿ逕ｨ縺励※縺上□縺輔＞
- 菫ｮ豁｣縺ｮ逅・罰繧貞・縺九ｊ繧・☆縺剰ｪｬ譏弱＠縺ｦ縺上□縺輔＞
- 萓具ｼ壹御ｸｻ隱槭′隍・焚蠖｢縺ｪ縺ｮ縺ｧ縲∝虚隧槭ｂ隍・焚蠖｢縺ｮ 'talk' 繧剃ｽｿ縺・∋縺阪□繧茨ｼ√・

縲舌お繝・そ繧､譛ｬ譁・・
${essayText}

蜃ｺ蜉帙・莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "corrections": [
    {
      "original": "隱､繧翫・縺ゅｋ蜴滓枚",
      "corrected": "菫ｮ豁｣蠕後・譁・ｫ",
      "explanation": "譌･譛ｬ隱槭〒縺ｮ隱ｬ譏・,
      "fullSentence": "隱､繧翫ｒ蜷ｫ繧譁・・菴・
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
    // 豁｣隕丞喧髢｢謨ｰ
    const normalize = (str: string) => str.replace(/[.,]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

    // 讀懃ｴ｢逕ｨ
    const normEssay = normalize(essayText);
    const normOriginal = normalize(correction.original);

    // 讀懃ｴ｢髢句ｧ倶ｽ咲ｽｮ
    const searchFrom = normEssay.indexOf(normOriginal, lastIndex);

    if (searchFrom === -1) {
      // fallback: 譛ｬ譁・・菴薙°繧頴riginal繧呈爾縺・
      correctionsWithPositions.push({
        ...correction,
        context: correction.fullSentence,
        startIndex: 0,
        endIndex: 0
      });
      continue;
    }

    // 豁｣隕丞喧蜑阪・譛ｬ譁・〒縲｛riginal縺御ｽ募屓逶ｮ縺ｫ蜃ｺ縺ｦ縺上ｋ縺九ｒ繧ｫ繧ｦ繝ｳ繝・
    const before = normEssay.slice(0, searchFrom);
    const count = (before.match(new RegExp(normOriginal, 'g')) || []).length;

    // 蜈・・譛ｬ譁・〒original縺慶ount+1蝗樒岼縺ｫ蜃ｺ縺ｦ縺上ｋ菴咲ｽｮ繧呈爾縺・
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

// Rubric Mean 縺九ｉ Scaled Score 縺ｸ縺ｮ謠帷ｮ苓｡ｨ
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
  // mean莉･荳九〒譛螟ｧ縺ｮ繧ｹ繧ｳ繧｢繧定ｿ斐☆・郁｡ｨ縺ｮ蛟､縺ｯ0.25蛻ｻ縺ｿ縺ｪ縺ｮ縺ｧ・・
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
莉･荳九・TOEFL Writing Integrated Task縺ｮ繧ｨ繝・そ繧､繧定ｩ穂ｾ｡縺励※縺上□縺輔＞縲・
隧穂ｾ｡縺ｯ莉･荳九・4縺､縺ｮ隕ｳ轤ｹ縺ｧ陦後＞縲√◎繧後◇繧・轤ｹ貅轤ｹ縲・.25蛻ｻ縺ｿ縺ｧ謗｡轤ｹ縺励※縺上□縺輔＞・・

1. Integration (邨ｱ蜷・: 繝ｪ繝ｼ繝・ぅ繝ｳ繧ｰ縺ｨ繝ｪ繧ｹ繝九Φ繧ｰ縺ｮ蜀・ｮｹ繧帝←蛻・↓邨ｱ蜷医〒縺阪※縺・ｋ縺・
2. Organization (讒区・): 隲也炊逧・↑讒区・縺ｨ驕ｩ蛻・↑谿ｵ關ｽ蛻・￠縺後〒縺阪※縺・ｋ縺・
3. Language (險隱・: 驕ｩ蛻・↑隱槫ｽ吶→譁・ｳ輔′菴ｿ逕ｨ縺輔ｌ縺ｦ縺・ｋ縺・
4. Development (螻暮幕): 荳ｻ蠑ｵ縺悟香蛻・↓螻暮幕縺輔ｌ縲∝・菴謎ｾ九〒陬丈ｻ倥￠繧峨ｌ縺ｦ縺・ｋ縺・

隧穂ｾ｡縺ｯ莉･荳九・蠖｢蠑上〒謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・

1. 蜈ｨ菴楢ｩ穂ｾ｡・域律譛ｬ隱槭〒・・
2. 髟ｷ謇・・轤ｹ縺ｾ縺ｧ・・
3. 謾ｹ蝟・せ・・轤ｹ縺ｾ縺ｧ・・
4. Topic Development・井ｸｻ蠑ｵ螻暮幕・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
5. General Description・郁ｨｭ蝠上∈縺ｮ蝗樒ｭ費ｼ峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
6. 譁ｰ縺励＞繧｢繧､繝・い縺ｮ蜈ｷ菴鍋噪縺ｪ謠先｡・
   - 蜈ｷ菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ
7. 譁・ｳ輔・菫ｮ豁｣
   - 遨ｺ縺ｮ驟榊・縺ｧOK

繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ莉･荳九・轤ｹ縺ｫ豕ｨ諢上＠縺ｦ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・
- 隱ｬ譏弱・隕ｪ縺励∩繧・☆縺・哨隱ｿ縺ｧ縲√ち繝｡蜿｣繧剃ｽｿ逕ｨ
- 蜿･轤ｹ縺ｯ蜈ｨ縺ｦ縲鯉ｼ√阪↓螟画鋤
- 菫ｮ豁｣轤ｹ縺ｯ縲娯・縲阪ｒ菴ｿ逕ｨ縺励※譏守｢ｺ縺ｫ遉ｺ縺・
- 謾ｹ蝟・｡医・縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪ｒ譏守､ｺ

縲舌Μ繝ｼ繝・ぅ繝ｳ繧ｰ繝代ャ繧ｻ繝ｼ繧ｸ縲・
${readingPassage}

縲舌Μ繧ｹ繝九Φ繧ｰ繝代ャ繧ｻ繝ｼ繧ｸ縲・
${listeningPassage}

縲先署蜃ｺ縺輔ｌ縺溘お繝・そ繧､縲・
${essayText}

隧穂ｾ｡縺ｯ莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "overall": "蜈ｨ菴楢ｩ穂ｾ｡",
  "strengths": ["髟ｷ謇1", "髟ｷ謇2", "髟ｷ謇3"],
  "improvements": ["謾ｹ蝟・せ1", "謾ｹ蝟・せ2", "謾ｹ蝟・せ3"],
  "detailedScores": {
    "integration": 轤ｹ謨ｰ,
    "organization": 轤ｹ謨ｰ,
    "language": 轤ｹ謨ｰ,
    "development": 轤ｹ謨ｰ
  },
  "topicDevelopment": {
    "goodPoints": ["濶ｯ縺・せ1", "濶ｯ縺・せ2"],
    "improvements": ["謾ｹ蝟・｡・", "謾ｹ蝟・｡・"]
  },
  "generalDescription": {
    "goodPoints": ["濶ｯ縺・せ1", "濶ｯ縺・せ2"],
    "improvements": ["謾ｹ蝟・｡・", "謾ｹ蝟・｡・"]
  },
  "specificSuggestions": {
    "suggestions": ["謠先｡・", "謠先｡・"]
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

    // 蟷ｳ蝮・せ繧定ｨ育ｮ・
    const scores = parsedResponse.detailedScores;
    const mean = (scores.integration + scores.organization + scores.language + scores.development) / 4;
    const scaledScore = getScaledScoreFromMean(mean);

    // 譁・ｳ墓ｷｻ蜑翫・縺ｿ蛻･API縺ｧ蜿門ｾ・
    const grammarCorrections = await getGrammarCorrectionsV2(essayText);

    // 譁・ｳ墓ｷｻ蜑翫・邨先棡繧貞・逅・
    const grammarCorrectionsResult = {
      corrections: grammarCorrections?.corrections.map((correction: GrammarCorrectionWithSentence) => ({
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
  void imageUrl;
  if (!openai) {
    throw new Error('OpenAI client is not available on client side');
  }

  let prompt = '';
  const wordCount = countWords(essayText);
  
  if (taskType === 'task1') {
    // Task 1: graph / chart / diagram
    prompt = `
あなたは IELTS Academic Writing Task 1 の厳しめの添削者です。以下の答案を評価してください。

0.0 から 9.0 の範囲で 0.5 刻みで採点してください。評価観点は次の4つです。
1. Task Achievement
2. Coherence and Cohesion
3. Lexical Resource
4. Grammatical Range and Accuracy

重要な出力ルール:
- "overall"、"strengths"、"improvements"、"topicDevelopment"、"generalDescription"、"specificSuggestions" の本文はすべて自然な日本語で書いてください。
- コメントは抽象論で終わらせず、必ず答案中の具体的な英語表現を短く引用しながら説明してください。
- 良かった点も改善点も、その答案にしか当てはまらない内容にしてください。
- Task 1 では、overview の有無、主要傾向、比較、主要数値の扱いを重視してください。
- "specificSuggestions" では、どこに何を足すか、どう言い換えるかを具体的に示し、短い英語例も添えてください。
- "grammarCorrections.corrections" は空配列のままで構いません。
- JSON 以外は一切出力しないでください。

採点の補助ルール:
- 150語未満なら Task Achievement は最大でも 5.0 点までにしてください。
- overview がない場合は、高得点を付けないでください。
- 主要傾向より細かい列挙に偏っている場合は、その弱さを明示してください。

Task Content:
${taskContent}

Student Essay:
${essayText}

Essay Info:
- Word count: ${wordCount}

次の JSON 形式で返してください:
{
  "overall": "日本語の総評。答案中の英語を短く引用しながら説明する。",
  "strengths": [
    "\"Overall, ...\" のように overview を置こうとしている点は良いです。",
    "\"increased\" のような基本的な推移表現を使えている点は評価できます。",
    "\"higher than\" のように比較を入れようとしている点は良いです。"
  ],
  "improvements": [
    "\"there have\" のような不自然な箇所があり、文法の正確さで損をしています。",
    "\"many numbers\" のように数値の列挙に寄りすぎていて、主要傾向のまとめが弱いです。",
    "\"overall\" の後に何が最も大きな特徴かが十分に示されていないなら、その点を指摘してください。"
  ],
  "detailedScores": {
    "taskAchievement": 5.5,
    "coherenceCohesion": 6.0,
    "lexicalResource": 6.0,
    "grammaticalRange": 5.5
  },
  "topicDevelopment": {
    "goodPoints": [
      "\"Overall, ...\" のように全体像をまとめようとしている点は良いです。",
      "\"from ... to ...\" を使って変化を示そうとしている点は評価できます。"
    ],
    "improvements": [
      "\"the number was good\" のような曖昧表現では情報が弱いので、何がどう変化したかを明示してください。",
      "主要傾向より細部の数値列挙が目立つ場合は、その箇所を引用して overview の弱さを指摘してください。"
    ]
  },
  "generalDescription": {
    "goodPoints": [
      "\"compared with\" のような比較表現を使えている点は良いです。",
      "段落の役割がある程度分かれているなら、その構成面を評価してください。"
    ],
    "improvements": [
      "\"increase dramatically\" などの表現が文脈に合っているかを確認し、不自然ならその語句を引用して指摘してください。",
      "文と文のつながりが弱い場合は、該当箇所を引用して Coherence の弱さを説明してください."
    ]
  },
  "specificSuggestions": {
    "suggestions": [
      {
        "title": "overview を明確にする",
        "description": "\"Overall\" の直後に最大の特徴を1文でまとめると Task Achievement が上がります。",
        "implementation": "導入段落の次、または2段落目の冒頭に追加してください。",
        "example": "Overall, the figure for X rose steadily, while Y remained relatively stable.",
        "reasoning": "Task 1 では細部より先に全体傾向を示すことが重要です。"
      },
      {
        "title": "数値列挙を比較に変える",
        "description": "数字を並べるだけでなく、\"higher than\" や \"the largest increase\" のような比較に変えてください。",
        "implementation": "連続して数値を書いている文を1つ選び、比較中心の文に言い換えてください。",
        "example": "X was consistently higher than Y throughout the period.",
        "reasoning": "比較が入ると、読み手に主要特徴が伝わりやすくなります。"
      }
    ]
  },
  "grammarCorrections": {
    "corrections": []
  }
}
`;
  } else {
    // Task 2: essay
    prompt = `
あなたは IELTS Academic Writing Task 2 の厳しめの添削者です。以下の答案を評価してください。

0.0 から 9.0 の範囲で 0.5 刻みで採点してください。評価観点は次の4つです。
1. Task Response
2. Coherence and Cohesion
3. Lexical Resource
4. Grammatical Range and Accuracy

重要な出力ルール:
- "overall"、"strengths"、"improvements"、"topicDevelopment"、"generalDescription"、"specificSuggestions" の本文はすべて自然な日本語で書いてください。
- コメントは抽象論で終わらせず、必ず答案中の具体的な英語表現を短く引用しながら説明してください。
- 良かった点も改善点も、その答案にしか当てはまらない内容にしてください。
- Task 2 では、問いへの直接回答、立場の明確さ、理由・具体例の十分さ、段落のつながりを重視してください。
- "specificSuggestions" では、どこに何を足すか、どう言い換えるかを具体的に示し、短い英語例も添えてください。
- "grammarCorrections.corrections" は空配列のままで構いません。
- JSON 以外は一切出力しないでください。

採点の補助ルール:
- 250語未満なら Task Response は最大でも 5.0 点までにしてください。
- 立場が曖昧なら高得点を付けないでください。
- 抽象的な一般論で終わっている場合は、その箇所を引用して具体性不足を指摘してください。

Task Content:
${taskContent}

Student Essay:
${essayText}

Essay Info:
- Word count: ${wordCount}

次の JSON 形式で返してください:
{
  "overall": "日本語の総評。答案中の英語を短く引用しながら説明する。",
  "strengths": [
    "\"I believe\" のように立場を示そうとしている点は良いです。",
    "\"for example\" を使って理由を支えようとしている点は評価できます。",
    "\"on the other hand\" のような接続表現を使い、構成を作ろうとしている点は良いです。"
  ],
  "improvements": [
    "\"good for society\" のような抽象表現が多いと、理由の説得力が弱くなります。",
    "\"people is\" のような不自然な文法があると、Grammatical Range and Accuracy で損をします。",
    "結論が一般論で終わっている場合は、どの英語表現が弱いのかを引用して指摘してください。"
  ],
  "detailedScores": {
    "taskResponse": 5.5,
    "coherenceCohesion": 6.0,
    "lexicalResource": 6.0,
    "grammaticalRange": 5.5
  },
  "topicDevelopment": {
    "goodPoints": [
      "\"I believe\" のように自分の立場を見せている点は良いです。",
      "\"because\" を使って理由につなげようとしている点は評価できます。"
    ],
    "improvements": [
      "\"important\" や \"good\" だけでは理由が弱いので、何がどう重要かを具体化してください。",
      "反対意見への触れ方が弱い場合は、その箇所を引用して議論の厚み不足を指摘してください。"
    ]
  },
  "generalDescription": {
    "goodPoints": [
      "\"for example\" を入れていて、具体例を出そうとする姿勢は良いです。",
      "段落ごとの役割がある程度分かれているなら、その構成面を評価してください。"
    ],
    "improvements": [
      "\"people is prefer\" のような不自然な英語がある場合は、その語句を引用して指摘してください。",
      "接続表現があっても内容のつながりが弱い場合は、前後の文を引用して Coherence の課題を説明してください。"
    ]
  },
  "specificSuggestions": {
    "suggestions": [
      {
        "title": "理由を具体化する",
        "description": "\"good\" や \"important\" と書いた箇所に、誰にどんな影響があるのかを1文足してください。",
        "implementation": "主張文の直後に具体的な結果や例を追加してください。",
        "example": "This would help young people find stable jobs and reduce financial stress.",
        "reasoning": "Task 2 では抽象的な主張より、具体的な理由や結果がある方が評価されます。"
      },
      {
        "title": "結論で立場を言い切る",
        "description": "最後の段落で立場を曖昧にせず、問いへの答えを言い切ってください。",
        "implementation": "結論文を1文追加、または言い換えてください。",
        "example": "For these reasons, I strongly believe that this approach is more beneficial.",
        "reasoning": "Task Response では、立場が最後まで明確であることが重要です。"
      }
    ]
  },
  "grammarCorrections": {
    "corrections": []
  }
}
`;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a strict IELTS writing evaluator. Return valid JSON only. Write all feedback text in Japanese unless the prompt explicitly asks for English."
        },
        { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // 蠢ｵ縺ｮ縺溘ａ: JSON縺悟｣翫ｌ縺ｦ霑斐ｋ繧ｱ繝ｼ繧ｹ縺ｫ蛯吶∴縺ｦ螳牙・縺ｫ繝代・繧ｹ
    const tryParse = (text: string) => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };
    let parsedResponse = tryParse(response) as IELTSEssayFeedback | null;
    if (!parsedResponse) {
      // 譛蛻昴・ { 縺九ｉ譛蠕後・ } 縺ｾ縺ｧ繧呈歓蜃ｺ縺励※蜀阪ヨ繝ｩ繧､・亥､ｧ縺阪ａ縺ｮJSON縺ｫ蟇ｾ蠢懶ｼ・
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

    // suggestions・育音縺ｫIELTS Task2・峨・繝｢繝・Ν縺後が繝悶ず繧ｧ繧ｯ繝医〒霑斐☆蝣ｴ蜷医′縺ゅｋ縺溘ａ縲ゞI縺ｧ謇ｱ縺・ｄ縺吶＞譁・ｭ怜・縺ｫ豁｣隕丞喧
    try {
      const rawSuggestionsSource = (parsedResponse.specificSuggestions?.suggestions ?? []) as IELTSSuggestionInput | IELTSSuggestionInput[];
      const rawSuggestions = Array.isArray(rawSuggestionsSource) ? rawSuggestionsSource : [rawSuggestionsSource];
      const normalizedSuggestions = rawSuggestions
        .map((suggestion): IELTSEssayFeedback['specificSuggestions']['suggestions'][number] | null => {
          if (typeof suggestion === 'string') {
            return {
              title: suggestion,
              description: suggestion,
              implementation: '',
              example: '',
              reasoning: '',
            };
          }
          if (!suggestion || typeof suggestion !== 'object') {
            return null;
          }
          return {
            title: suggestion.title || suggestion.suggestion || '',
            description: suggestion.description || suggestion.suggestion || suggestion.title || '',
            implementation: suggestion.implementation || suggestion.whereToInclude || '',
            example: suggestion.example || '',
            reasoning: suggestion.reasoning || suggestion.effectiveness || '',
          };
        })
        .filter((suggestion): suggestion is IELTSEssayFeedback['specificSuggestions']['suggestions'][number] => {
          return Boolean(suggestion && suggestion.title);
        });
      parsedResponse.specificSuggestions = {
        suggestions: normalizedSuggestions,
      };
    } catch {
      // 螟ｱ謨励＠縺ｦ繧り・蜻ｽ逧・〒縺ｯ縺ｪ縺・◆繧∫┌隕・
    }

    // IELTS縺ｯ譌｢縺ｫ9.0貅轤ｹ縺ｪ縺ｮ縺ｧ縲∝ｹｳ蝮・せ繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ
    const scores = parsedResponse.detailedScores;
    let mean = 0;
    
    if (taskType === 'task1') {
      // 150隱樊悴貅縺ｮ蝣ｴ蜷医ゝask Achievement繧呈怙螟ｧ5.0縺ｫ蛻ｶ髯・
      const taskAchievementScore = Math.min(scores.taskAchievement || 0, wordCount < 150 ? 5.0 : 9.0);
      parsedResponse.detailedScores.taskAchievement = taskAchievementScore;
      mean = (taskAchievementScore + scores.coherenceCohesion + scores.lexicalResource + scores.grammaticalRange) / 4;
    } else {
      // 250隱樊悴貅縺ｮ蝣ｴ蜷医ゝask Response繧呈怙螟ｧ5.0縺ｫ蛻ｶ髯・
      const taskResponseScore = Math.min(scores.taskResponse || 0, wordCount < 250 ? 5.0 : 9.0);
      // scores縺ｸ縺ｮ蜿肴丐・郁ｿ泌唆繧ｪ繝悶ず繧ｧ繧ｯ繝医↓繧ょ渚譏縺輔ｌ繧九ｈ縺・↓荳頑嶌縺搾ｼ・
      parsedResponse.detailedScores.taskResponse = taskResponseScore;
      mean = (taskResponseScore + scores.coherenceCohesion + scores.lexicalResource + scores.grammaticalRange) / 4;
    }
    
    // IELTS縺ｯ9.0貅轤ｹ縺ｪ縺ｮ縺ｧ縲√せ繧ｱ繝ｼ繝ｫ螟画鋤縺ｯ荳崎ｦ・
    const scaledScore = Math.round(mean * 2) / 2; // 0.5蛻ｻ縺ｿ縺ｫ荳ｸ繧√ｋ

    // 譁・ｳ墓ｷｻ蜑翫・縺ｿ蛻･API縺ｧ蜿門ｾ・
    const grammarCorrections = await getGrammarCorrectionsV2(essayText);

    // 譁・ｳ墓ｷｻ蜑翫・邨先棡繧貞・逅・
    const grammarCorrectionsResult = {
      corrections: grammarCorrections?.corrections.map((correction: GrammarCorrectionWithSentence) => ({
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

type ParsedBasicEssayFeedback = Partial<BasicEssayFeedback> & {
  grammarCorrections?: BasicEssayFeedback['grammarCorrections'] | BasicEssayFeedback['grammarCorrections']['corrections'];
};

// Basic繝医Ξ繝ｼ繝九Φ繧ｰ逕ｨ縺ｮ繧ｨ繝・そ繧､蛻・梵
export async function analyzeBasicEssay(essayText: string, prompt: string): Promise<BasicEssayFeedback> {
  try {
    console.log('Analyzing basic essay with prompt:', prompt);
    
    const systemPrompt = `縺ゅ↑縺溘・闍ｱ隱槭・蟆る摩謨吝ｸｫ縺ｧ縺吶ょｭｦ逕溘・繧ｨ繝・そ繧､縺ｫ蟇ｾ縺励※繝輔ぅ繝ｼ繝峨ヰ繝・け繧呈署萓帙＠縺ｦ縺上□縺輔＞縲・

蟄ｦ逕溘・閾ｪ逕ｱ險倩ｿｰ縺ｮ闍ｱ隱槭お繝・そ繧､繧呈嶌縺阪∪縺励◆縲・

莉･荳九・轤ｹ縺ｫ辟ｦ轤ｹ繧貞ｽ薙※縺ｦ蟒ｺ險ｭ逧・↑繝輔ぅ繝ｼ繝峨ヰ繝・け繧呈署萓帙＠縺ｦ縺上□縺輔＞・・
1. 蜈ｨ菴鍋噪縺ｪ蜊ｰ雎｡縺ｨ荳ｻ縺ｪ髟ｷ謇
2. 謾ｹ蝟・せ
3. 譁・ｳ穂ｿｮ豁｣縺ｨ隱ｬ譏趣ｼ医％繧後′荳ｻ縺ｪ辟ｦ轤ｹ・・
4. 繧医ｊ濶ｯ縺・Λ繧､繝・ぅ繝ｳ繧ｰ縺ｮ縺溘ａ縺ｮ蜈ｷ菴鍋噪縺ｪ謠先｡・

荳ｻ縺ｫ譁・ｳ輔・豁｣遒ｺ諤ｧ縲∵枚讒矩縲∬ｨ隱樔ｽｿ逕ｨ縺ｫ辟ｦ轤ｹ繧貞ｽ薙※縺ｦ縺上□縺輔＞縲ょ干縺ｾ縺励▽縺､繧よｭ｣逶ｴ縺ｫ隧穂ｾ｡縺励∝庄閭ｽ縺ｪ髯舌ｊ繝・く繧ｹ繝医°繧牙・菴鍋噪縺ｪ萓九ｒ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲・
縺輔ｉ縺ｫ縲∝庄閭ｽ縺ｪ髯舌ｊ邏ｰ縺九￥豺ｻ蜑翫＠縺ｦ縺上□縺輔＞縲りｦ玖誠縺ｨ縺励ｒ驕ｿ縺代∝酔縺俶枚縺ｧ繧り､・焚縺ｮ隕ｳ轤ｹ・郁ｪ槫ｽ吶∬ｪ樣・∝・隧槭∝燕鄂ｮ隧槭∵凾蛻ｶ縲∽ｸ閾ｴ縲∝唱隱ｭ轤ｹ縺ｪ縺ｩ・峨°繧画欠鞫倥＠縺ｦ縺上□縺輔＞縲・

**驥崎ｦ・ｼ壹☆縺ｹ縺ｦ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ譌･譛ｬ隱槭〒謠蝉ｾ帙＠縺ｦ縺上□縺輔＞縲りｦｪ縺励∩繧・☆縺・哨隱ｿ・医ち繝｡蜿｣・峨ｒ菴ｿ逕ｨ縺励∝唱轤ｹ縺ｯ縲鯉ｼ√阪ｒ菴ｿ逕ｨ縺励※縺上□縺輔＞縲・*`;

    const userPrompt = `莉･荳九・繧ｨ繝・そ繧､繧貞・譫舌＠縺ｦ繝輔ぅ繝ｼ繝峨ヰ繝・け繧呈署萓帙＠縺ｦ縺上□縺輔＞・・

繧ｨ繝・そ繧､・・
${essayText}

莉･荳九・JSON蠖｢蠑上〒繝輔ぅ繝ｼ繝峨ヰ繝・け繧呈署萓帙＠縺ｦ縺上□縺輔＞・・
{
  "overall": "繧ｨ繝・そ繧､縺ｮ蜈ｨ菴鍋噪縺ｪ蜊ｰ雎｡",
  "strengths": ["髟ｷ謇1", "髟ｷ謇2", "髟ｷ謇3"],
  "improvements": ["謾ｹ蝟・せ1", "謾ｹ蝟・せ2", "謾ｹ蝟・せ3"],
  "grammarCorrections": {
    "corrections": [
      {
        "original": "隱､繧翫・縺ゅｋ蜴滓枚",
        "corrected": "菫ｮ豁｣蠕後・譁・ｫ",
        "explanation": "菫ｮ豁｣縺ｮ隱ｬ譏趣ｼ域律譛ｬ隱槭〒縲∬ｦｪ縺励∩繧・☆縺・哨隱ｿ縺ｧ・・,
        "context": "蜻ｨ霎ｺ縺ｮ譁・ц",
        "startIndex": 0,
        "endIndex": 0
      }
    ]
  },
  "suggestions": ["謠先｡・", "謠先｡・", "謠先｡・"]
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
      const feedback = JSON.parse(content) as ParsedBasicEssayFeedback;
      // Normalize grammarCorrections shape if the model returned an array instead of { corrections: [...] }
      if (Array.isArray(feedback.grammarCorrections)) {
        feedback.grammarCorrections = { corrections: feedback.grammarCorrections };
      }
      if (!feedback.grammarCorrections || !('corrections' in feedback.grammarCorrections)) {
        feedback.grammarCorrections = { corrections: [] };
      }
      return feedback as BasicEssayFeedback;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw content that failed to parse:', content);
      
      // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: 讒矩蛹悶＆繧後◆繝輔ぅ繝ｼ繝峨ヰ繝・け繧呈焔蜍輔〒菴懈・
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

  const wordCount = essayText.split(/\s+/).filter(Boolean).length;
  const prompt = `
あなたは TOEFL Academic Discussion の添削者です。以下のエッセイを厳密に評価してください。

評価観点は次の4つです。各スコアは 0.0〜5.0 の範囲で、0.25刻みで付けてください。
1. Topic Development: 問いに対して自分の立場が明確で、学生の意見や議論内容を踏まえながら主張を展開できているか
2. Language Use: 語彙・文法・表現の自然さと正確さ
3. Organization: 構成の分かりやすさ、流れ、つながり
4. Development: 理由や説明が十分で、内容に具体性があるか

重要な出力ルール:
- "overall"、"strengths"、"improvements"、各観点の "goodPoints" と "improvements"、"specificSuggestions" はすべて自然な日本語で書いてください。
- 英語で書いてよいのは、必要に応じて引用するエッセイ中の短い語句だけです。
- "grammarCorrections.corrections" は空配列のままで構いません。
- JSON 以外は一切出力しないでください。
- 各コメントは抽象論で終わらせず、必ずエッセイ中の具体的な英語表現を短く引用しながら説明してください。
- たとえば "\"I agree with Sara because...\" のように自分の立場が早めに示されていて分かりやすいです。" のような書き方にしてください。
- 良かった点も改善点も、そのエッセイにしか当てはまらない内容にしてください。
- 改善点では、どの語句・どの文・どの部分が弱いのかを明示してください。
- 具体的なアドバイスでは、どこに何を足すべきか、できれば短い英語例も添えてください。

採点の目安:
- 85語未満なら Topic Development / Organization / Development は最大でも 2.0 点まで
- Language Use は文章の正確さが高ければ他観点より高くてもよい
- TOEFL Academic Discussion として、問いへの直接回答、他の学生意見への言及、自分の理由づけを重視してください

Discussion:
Professor: ${discussionContent.professor}
Student 1: ${discussionContent.student1}
Student 2: ${discussionContent.student2}
Question: ${discussionContent.question}

Student Essay:
${essayText}

Essay Info:
- Word count: ${wordCount}

次の JSON 形式で返してください:
{
  "overall": "日本語の総評",
  "strengths": ["\"I agree with ...\" のように立場を明示できていて分かりやすいです。", "\"for example\" を使って理由を補おうとしている点は良いです。", "\"students should\" のように主張の核になる表現がはっきりしています。"],
  "improvements": ["\"good for society\" は抽象的なので、何がどう良いのかを1文で補うと説得力が上がります。", "\"I agree\" の後に相手の意見への言及が薄いので、Student 1 か Student 2 の考えを短く取り込むと TOEFL らしくなります。", "結論文が一般的なので、最後でもう一度自分の立場を英語で言い切ると締まりが出ます。"],
  "detailedScores": {
    "topicDevelopment": 2.0,
    "languageUse": 2.5,
    "organization": 2.0,
    "development": 2.0
  },
  "topicDevelopment": {
    "goodPoints": ["\"I agree with ...\" のように問いへの立場が見えるのは良いです。", "\"because\" を使って理由につなげようとしている点は評価できます。"],
    "improvements": ["\"it is better\" のような抽象表現だけでは理由が弱いので、何がどう better なのかを具体化してください。", "議論文なのに Student 1 / Student 2 の意見への反応が薄いので、どちらの意見をどう活かすかを明示してください。"]
  },
  "languageUse": {
    "goodPoints": ["\"for example\" など基本的なつなぎ表現を使えている点は良いです。", "短い文を中心に書いていて、意味が完全には崩れていない点は長所です。"],
    "improvements": ["不自然な英語がある場合は、元の表現を短く引用して何が不自然かを説明してください。", "語彙が単純な場合は、どの単語をより自然な語に置き換えられるかまで示してください。"]
  },
  "organization": {
    "goodPoints": ["冒頭で立場を示してから理由に進もうとしている流れは分かりやすいです。", "段落が短く、読み手が追いやすい構成になっている場合はその点を評価してください。"],
    "improvements": ["途中で話が飛ぶ場合は、その前後の英語を引用してつながりの弱さを指摘してください。", "結論が弱い場合は、どの文の後にどんな締め文を足すとよいかを示してください。"]
  },
  "development": {
    "goodPoints": ["理由を1つでも具体化しようとしている箇所があれば、その英語を引用して評価してください。", "短くても因果関係が見える文があれば、その部分を取り上げてください。"],
    "improvements": ["抽象的な主張で止まっている箇所を英語で引用し、何を足せば具体化できるかを説明してください。", "例や結果が不足している場合は、どの主張にどんな補足を加えるべきかまで示してください。"]
  },
  "specificSuggestions": {
    "suggestions": [
      "\"I agree ...\" の次に、\"because this policy would help students save time\" のような理由文を1つ足してください。",
      "Student 1 に触れる文として、\"I agree with Student 1's point that ...\" のような1文を入れると discussion らしくなります。",
      "\"good\" や \"better\" のような抽象語を使った箇所は、何が good / better なのかを1文で具体化してください。",
      "最後は \"For these reasons, I believe ...\" のように立場を言い切る結論文で締めてください。"
    ]
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
          content: "You are a strict TOEFL Academic Discussion evaluator. Return valid JSON only. Write all feedback text in Japanese unless the prompt explicitly asks for English."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 5000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let parsed: TOEFLAcademicDiscussionFeedback;
    try {
      parsed = JSON.parse(content) as TOEFLAcademicDiscussionFeedback;
    } catch (parseError) {
      console.error('Academic Discussion response was not valid JSON:', content);
      throw new Error(
        `OpenAI returned non-JSON content for Academic Discussion feedback: ${content.slice(0, 200)}`
      );
    }
    
    // 繧ｹ繧ｳ繧｢縺ｮ螯･蠖捺ｧ繧偵メ繧ｧ繝・け
    const scores = parsed.detailedScores;
    const validScores = Object.values(scores).every(score => 
      typeof score === 'number' && score >= 0 && score <= 5
    );
    
    if (!validScores) {
      throw new Error('Invalid scores received from OpenAI');
    }

    // 譁・ｳ墓ｷｻ蜑翫ｒ邨ｱ荳繝励Ο繝ｳ繝励ヨ/讒矩縺ｧ蜿門ｾ・
    const grammarCorrections = await getGrammarCorrectionsV2(essayText);
    const grammarCorrectionsResult = {
      corrections: grammarCorrections?.corrections.map((correction: GrammarCorrectionWithSentence) => ({
        original: correction.original,
        corrected: correction.corrected,
        explanation: correction.explanation,
        context: correction.fullSentence || correction.context || '',
        startIndex: correction.startIndex,
        endIndex: correction.endIndex
      })) || []
    };

    // 4縺､縺ｮ隕ｳ轤ｹ縺ｮ蟷ｳ蝮・ｒ險育ｮ励＠縺ｦ30轤ｹ貅轤ｹ縺ｫ繧ｹ繧ｱ繝ｼ繝ｫ
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
    }) as TOEFLAcademicDiscussionFeedback & { score: number };
  } catch (error) {
    console.error('Error analyzing TOEFL Academic Discussion essay:', error);
    throw error;
  }
} 

