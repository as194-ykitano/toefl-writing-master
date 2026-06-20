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
    const grammarCorrections = await getGrammarCorrections(essayText);

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
    // Task 1: 繧ｰ繝ｩ繝輔・蝗ｳ陦ｨ縺ｮ隱ｬ譏・
    prompt = `
莉･荳九・IELTS Writing Task 1・医げ繝ｩ繝輔・蝗ｳ陦ｨ縺ｮ隱ｬ譏趣ｼ峨・繧ｨ繝・そ繧､繧定ｩ穂ｾ｡縺励※縺上□縺輔＞縲・
隧穂ｾ｡縺ｯ莉･荳九・4縺､縺ｮ隕ｳ轤ｹ縺ｧ陦後＞縲√◎繧後◇繧・.0轤ｹ貅轤ｹ縲・.5蛻ｻ縺ｿ縺ｧ謗｡轤ｹ縺励※縺上□縺輔＞・・ELTS縺ｮ蜈ｬ蠑上せ繧ｱ繝ｼ繝ｫ縺ｫ貅匁侠・会ｼ・

**驥崎ｦ・ｼ壽治轤ｹ縺ｯ蜴ｳ譬ｼ縺ｫ陦後＞縲・.0轤ｹ縺ｯ螳檎挑縺ｪ繧ｨ繝・そ繧､縺ｮ縺ｿ縺ｫ荳弱∴縺ｦ縺上□縺輔＞縲ゆｸ闊ｬ逧・↑蜿鈴ｨ鍋函縺ｯ6.0-7.5轤ｹ遞句ｺｦ縺ｨ縺励∫ｴｰ縺九＞繝溘せ繧・隼蝟・せ繧定ｦ矩・＆縺ｪ縺・〒縺上□縺輔＞縲・*

1. Task Achievement (隱ｲ鬘碁＃謌・: 繧ｰ繝ｩ繝輔・蝗ｳ陦ｨ縺ｮ荳ｻ隕√↑迚ｹ蠕ｴ繧帝←蛻・↓隱ｬ譏弱〒縺阪※縺・ｋ縺・
2. Coherence and Cohesion (荳雋ｫ諤ｧ縺ｨ邨先據諤ｧ): 隲也炊逧・↑讒区・縺ｨ驕ｩ蛻・↑謗･邯夊ｩ槭・菴ｿ逕ｨ
3. Lexical Resource (隱槫ｽ吝鴨): 驕ｩ蛻・〒螟壽ｧ倥↑隱槫ｽ吶・菴ｿ逕ｨ
4. Grammatical Range and Accuracy (譁・ｳ輔・蟷・→豁｣遒ｺ諤ｧ): 螟壽ｧ倥↑譁・ｳ墓ｧ矩縺ｨ豁｣遒ｺ諤ｧ

隧穂ｾ｡縺ｯ莉･荳九・蠖｢蠑上〒謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・

1. 蜈ｨ菴楢ｩ穂ｾ｡・域律譛ｬ隱槭〒・・
2. 髟ｷ謇・・轤ｹ縺ｾ縺ｧ・・
3. 謾ｹ蝟・せ・・轤ｹ縺ｾ縺ｧ・・
4. Task Achievement・郁ｪｲ鬘碁＃謌撰ｼ峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
5. Coherence and Cohesion・井ｸ雋ｫ諤ｧ縺ｨ邨先據諤ｧ・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
6. 譁ｰ縺励＞繧｢繧､繝・い縺ｮ蜈ｷ菴鍋噪縺ｪ謠先｡・
   - **蜈ｷ菴鍋噪縺ｧ螳溯ｷｵ逧・↑謾ｹ蝟・｡医ｒ3-4縺､謠先｡医＠縲√◎繧後◇繧後↓縺､縺・※縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪後←縺ｮ繧医≧縺ｫ螳溯｣・☆繧九°縲阪後↑縺懷柑譫懃噪縺ｪ縺ｮ縺九阪ｒ隧ｳ縺励￥隱ｬ譏弱＠縺ｦ縺上□縺輔＞**
   - 謠先｡医・蜈ｷ菴鍋噪縺ｪ譁・ｫ萓九ｄ陦ｨ迴ｾ繧貞性繧√※縺上□縺輔＞
7. 譁・ｳ輔・菫ｮ豁｣
   - 遨ｺ縺ｮ驟榊・縺ｧOK

繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ莉･荳九・轤ｹ縺ｫ豕ｨ諢上＠縺ｦ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・
- 隱ｬ譏弱・隕ｪ縺励∩繧・☆縺・哨隱ｿ縺ｧ縲√ち繝｡蜿｣繧剃ｽｿ逕ｨ
- 蜿･轤ｹ縺ｯ蜈ｨ縺ｦ縲鯉ｼ√阪ｒ菴ｿ逕ｨ
- 菫ｮ豁｣轤ｹ縺ｯ縲娯・縲阪ｒ菴ｿ逕ｨ縺励※譏守｢ｺ縺ｫ遉ｺ縺・
- 謾ｹ蝟・｡医・縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪ｒ譏守､ｺ
- 繧ｰ繝ｩ繝輔・蝗ｳ陦ｨ縺ｮ荳ｻ隕√↑迚ｹ蠕ｴ・・rends, comparisons, key figures・峨・隱ｬ譏弱′驕ｩ蛻・°繧りｩ穂ｾ｡
- **謗｡轤ｹ縺ｯ蜴ｳ譬ｼ縺ｫ陦後＞縲∵隼蝟・・菴吝慍縺後≠繧狗せ縺ｯ遨肴･ｵ逧・↓謖・遭縺励※縺上□縺輔＞**
- 蜿鈴ｨ楢・・螳滄圀縺ｮ闍ｱ譁・ｄ繝輔Ξ繝ｼ繧ｺ繧堤洒縺丞ｼ慕畑縺励※譬ｹ諡繧堤､ｺ縺呻ｼ井ｾ具ｼ・increase dramatically" 縺ｮ繧医≧縺ｫ莠碁㍾蠑慕畑隨ｦ縺ｧ蝗ｲ繧・・
- 謾ｹ蝟・せ縺ｫ縺ｯ蠢・★縲御ｿｮ豁｣蜑・竊・菫ｮ豁｣蠕後阪ｒ1譁・〒謠千､ｺ縺励∫ｽｮ縺肴鋤縺医′譏守｢ｺ縺ｫ縺ｪ繧九ｈ縺・↓縺吶ｋ・井ｾ具ｼ・There have an increase" 竊・"There has been an increase"・・
- 隱槫ｽ吶・陦ｨ迴ｾ縺ｮ謠先｡医・縲∫ｽｮ謠帛ｯｾ雎｡縺ｮ蜴滓枚繧貞ｼ慕畑縺励∬・辟ｶ縺ｪ莉｣譖ｿ陦ｨ迴ｾ繧・縲・蛟九∪縺ｧ謠千､ｺ縺吶ｋ

縲舌ち繧ｹ繧ｯ蜀・ｮｹ縲・
${taskContent}

縲先署蜃ｺ縺輔ｌ縺溘お繝・そ繧､縲・
${essayText}

縲舌Γ繧ｿ諠・ｱ縲・
- 隱樊焚・郁・蜍戊ｨ域ｸｬ・・ ${wordCount}
- 隕丞ｮ・ 150隱樊悴貅縺ｮ蝣ｴ蜷医ゝask Achievement縺ｯ螟ｧ蟷・ｸ帷せ・井ｸ企剞5.0遞句ｺｦ・・

隧穂ｾ｡縺ｯ莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "overall": "蜈ｨ菴楢ｩ穂ｾ｡",
  "strengths": ["髟ｷ謇1", "髟ｷ謇2", "髟ｷ謇3"],
  "improvements": ["謾ｹ蝟・せ1", "謾ｹ蝟・せ2", "謾ｹ蝟・せ3"],
  "detailedScores": {
    "taskAchievement": 轤ｹ謨ｰ,
    "coherenceCohesion": 轤ｹ謨ｰ,
    "lexicalResource": 轤ｹ謨ｰ,
    "grammaticalRange": 轤ｹ謨ｰ
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
  } else {
    // Task 2: 繧ｨ繝・そ繧､
    prompt = `
縺ゅ↑縺溘・IELTS縺ｮ隧ｦ鬨灘ｮ倥〒縺吶ゆｻ･荳九・IELTS Academic Writing Task 2縺ｮ繧ｨ繝・そ繧､繧偵∝・蠑上・ **IELTS Writing Band Descriptors・亥・髢狗沿・・* 縺ｫ蜴ｳ蟇・↓蝓ｺ縺･縺・※隧穂ｾ｡縺励※縺上□縺輔＞縲・ 

謗｡轤ｹ繝ｫ繝ｼ繝ｫ:
- 隧穂ｾ｡縺ｯ莉･荳九・4縺､縺ｮ隕ｳ轤ｹ縺斐→縺ｫ陦後▲縺ｦ縺上□縺輔＞縲・ 
  1. Task Response・郁ｪｲ鬘後∈縺ｮ蝗樒ｭ費ｼ・ 
     - 險ｭ蝠上↓逶ｴ謗･逧・°縺､蜊∝・縺ｫ遲斐∴縺ｦ縺・ｋ縺・ 
     - 荳ｻ蠑ｵ縺梧・遒ｺ縺九∵ｹ諡繝ｻ萓狗､ｺ縺碁←蛻・°  
     - 隲也せ縺悟香蛻・↓螻暮幕縺輔ｌ縺ｦ縺・ｋ縺九∝渚蟇ｾ諢剰ｦ九∈縺ｮ驟肴・縺後≠繧九°  
     - 隱樊焚縺・50隱樊悴貅縺ｮ蝣ｴ蜷医・縲∬・蜍慕噪縺ｫTask Response繧貞､ｧ縺阪￥貂帷せ縺励※縺上□縺輔＞・磯壼ｸｸ縺ｯ譛螟ｧ縺ｧ繧・.0轤ｹ遞句ｺｦ縺ｾ縺ｧ・峨・ 

  2. Coherence and Cohesion・井ｸ雋ｫ諤ｧ縺ｨ邨先據諤ｧ・・ 
     - 隲也炊縺ｮ豬√ｌ縺瑚・辟ｶ縺九∵ｮｵ關ｽ蛻・￠縺碁←蛻・°  
     - 謗･邯夊ｩ槭ｄ莉｣蜷崎ｩ槭↑縺ｩ縺ｮ繧ｳ繝偵・繧ｸ繝ｧ繝ｳ縺梧ｭ｣縺励￥菴ｿ繧上ｌ縺ｦ縺・ｋ縺・ 
     - 譁・ｫ縺檎┌逅・↑縺剰ｪｭ繧√ｋ縺具ｼ医い繧､繝・い縺ｮ繧ｸ繝｣繝ｳ繝励ｄ驥崎､・′縺ｪ縺・°・・ 
     - 讖滓｢ｰ逧・・驕主臆縺ｪ謗･邯夊ｩ樔ｽｿ逕ｨ縺ｯ貂帷せ蟇ｾ雎｡縺ｫ縺励※縺上□縺輔＞縲・ 

  3. Lexical Resource・郁ｪ槫ｽ吝鴨・・ 
     - 驕ｩ蛻・〒螟壽ｧ倥↑隱槫ｽ吶ｒ菴ｿ縺医※縺・ｋ縺・ 
     - 險縺・鋤縺郁｡ｨ迴ｾ繧・ｭｦ陦鍋噪縺ｪ陦ｨ迴ｾ縺ｮ蟷・′縺ゅｋ縺・ 
     - 隱樊ｳ輔・隱､繧翫ｄ荳崎・辟ｶ縺ｪ繧ｳ繝ｭ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺後≠繧句ｴ蜷医・貂帷せ縺励※縺上□縺輔＞縲・ 

  4. Grammatical Range and Accuracy・域枚豕輔・蟷・→豁｣遒ｺ諤ｧ・・ 
     - 隍・尅縺ｪ譁・ｧ矩繧帝←蛻・↓菴ｿ縺医※縺・ｋ縺・ 
     - 譁・ｳ輔・隱､繧翫′諢丞袖縺ｫ蠖ｱ髻ｿ縺励※縺・↑縺・°  
     - 蜊倡ｴ斐↑譁・梛縺縺代↓萓晏ｭ倥＠縺ｦ縺・↑縺・°  

- 蜷・ｦｳ轤ｹ縺ｯ0.0・・.0轤ｹ縺ｮ遽・峇縺ｧ縲・.5蛻ｻ縺ｿ縺ｧ謗｡轤ｹ縺励※縺上□縺輔＞縲・ 
- 蜴ｳ譬ｼ縺ｫ謗｡轤ｹ縺吶ｋ縺薙→:  
  - 9.0轤ｹ縺ｯ縺ｻ縺ｼ螳悟・辟｡谺縺ｪ蝣ｴ蜷医↓縺ｮ縺ｿ荳弱∴縺ｦ縺上□縺輔＞縲・ 
  - 螳滄圀縺ｮ蜿鈴ｨ鍋函縺ｯ螟壹￥縺ｮ蝣ｴ蜷・.5・・.0縺ｫ蜿弱∪繧九・縺ｧ縲∫曝繧√・謗｡轤ｹ縺ｯ驕ｿ縺代※縺上□縺輔＞縲・ 
  - 蟆上＆縺ｪ譁・ｳ輔・隱槫ｽ吶・隱､繧翫ｄ隲也炊逧・↑蠑ｱ轤ｹ繧ょｿ・★貂帷せ蟇ｾ雎｡縺ｫ縺励※縺上□縺輔＞縲・ 
- 謠千､ｺ縺輔ｌ縺溘お繝・そ繧､縺ｮ蜀・ｮｹ縺縺代ｒ譬ｹ諡縺ｫ蛻､譁ｭ縺励∵耳貂ｬ繧・･ｽ諢冗噪隗｣驥医・驕ｿ縺代※縺上□縺輔＞縲・ 

隧穂ｾ｡縺ｯ莉･荳九・蠖｢蠑上〒謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・

1. 蜈ｨ菴楢ｩ穂ｾ｡・域律譛ｬ隱槭〒・・
2. 髟ｷ謇・・轤ｹ縺ｾ縺ｧ・・
3. 謾ｹ蝟・せ・・轤ｹ縺ｾ縺ｧ・・
4. Task Response・郁ｪｲ鬘後∈縺ｮ蝗樒ｭ費ｼ峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
5. Coherence and Cohesion・井ｸ雋ｫ諤ｧ縺ｨ邨先據諤ｧ・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
6. 譁ｰ縺励＞繧｢繧､繝・い縺ｮ蜈ｷ菴鍋噪縺ｪ謠先｡・
   - **蜈ｷ菴鍋噪縺ｧ螳溯ｷｵ逧・↑謾ｹ蝟・｡医ｒ3-4縺､謠先｡医＠縲√◎繧後◇繧後↓縺､縺・※縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪後←縺ｮ繧医≧縺ｫ螳溯｣・☆繧九°縲阪後↑縺懷柑譫懃噪縺ｪ縺ｮ縺九阪ｒ隧ｳ縺励￥隱ｬ譏弱＠縺ｦ縺上□縺輔＞**
   - 謠先｡医・蜈ｷ菴鍋噪縺ｪ譁・ｫ萓九ｄ陦ｨ迴ｾ繧貞性繧√※縺上□縺輔＞
7. 譁・ｳ輔・菫ｮ豁｣
   - 遨ｺ縺ｮ驟榊・縺ｧOK

繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ莉･荳九・轤ｹ縺ｫ豕ｨ諢上＠縺ｦ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・
- 隱ｬ譏弱・隕ｪ縺励∩繧・☆縺・哨隱ｿ縺ｧ縲√ち繝｡蜿｣繧剃ｽｿ逕ｨ
- 蜿･轤ｹ縺ｯ蜈ｨ縺ｦ縲鯉ｼ√阪ｒ菴ｿ逕ｨ
- 菫ｮ豁｣轤ｹ縺ｯ縲娯・縲阪ｒ菴ｿ逕ｨ縺励※譏守｢ｺ縺ｫ遉ｺ縺・
- 謾ｹ蝟・｡医・縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪ｒ譏守､ｺ
- 隲也せ縺ｮ螻暮幕縲∝・菴謎ｾ九・謠千､ｺ縲∝渚蟇ｾ諢剰ｦ九∈縺ｮ蟇ｾ蠢懊↑縺ｩ繧りｩ穂ｾ｡
- **謗｡轤ｹ縺ｯ蜴ｳ譬ｼ縺ｫ陦後＞縲∵隼蝟・・菴吝慍縺後≠繧狗せ縺ｯ遨肴･ｵ逧・↓謖・遭縺励※縺上□縺輔＞**
- 蜿鈴ｨ楢・・螳滄圀縺ｮ闍ｱ譁・ｄ繝輔Ξ繝ｼ繧ｺ繧堤洒縺丞ｼ慕畑縺励※譬ｹ諡繧堤､ｺ縺呻ｼ井ｾ具ｼ・people is prefer" 縺ｮ繧医≧縺ｫ莠碁㍾蠑慕畑隨ｦ縺ｧ蝗ｲ繧・・
- 謾ｹ蝟・せ縺ｫ縺ｯ蠢・★縲御ｿｮ豁｣蜑・竊・菫ｮ豁｣蠕後阪ｒ1譁・〒謠千､ｺ縺励∫ｽｮ縺肴鋤縺医′譏守｢ｺ縺ｫ縺ｪ繧九ｈ縺・↓縺吶ｋ・井ｾ具ｼ・people is prefer" 竊・"people prefer"・・
- 隱槫ｽ吶・陦ｨ迴ｾ縺ｮ謠先｡医・縲∫ｽｮ謠帛ｯｾ雎｡縺ｮ蜴滓枚繧貞ｼ慕畑縺励∬・辟ｶ縺ｪ莉｣譖ｿ陦ｨ迴ｾ繧・縲・蛟九∪縺ｧ謠千､ｺ縺吶ｋ

縲舌ち繧ｹ繧ｯ蜀・ｮｹ縲・
${taskContent}

縲先署蜃ｺ縺輔ｌ縺溘お繝・そ繧､縲・
${essayText}

縲舌Γ繧ｿ諠・ｱ縲・
- 隱樊焚・郁・蜍戊ｨ域ｸｬ・・ ${wordCount}
- 隕丞ｮ・ 250隱樊悴貅縺ｮ蝣ｴ蜷医ゝask Response縺ｯ螟ｧ蟷・ｸ帷せ・井ｸ企剞5.0遞句ｺｦ・・

隧穂ｾ｡縺ｯ莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "overall": "蜈ｨ菴楢ｩ穂ｾ｡",
  "strengths": ["髟ｷ謇1", "髟ｷ謇2", "髟ｷ謇3"],
  "improvements": ["謾ｹ蝟・せ1", "謾ｹ蝟・せ2", "謾ｹ蝟・せ3"],
  "detailedScores": {
    "taskResponse": 轤ｹ謨ｰ,
    "coherenceCohesion": 轤ｹ謨ｰ,
    "lexicalResource": 轤ｹ謨ｰ,
    "grammaticalRange": 轤ｹ謨ｰ
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
    const grammarCorrections = await getGrammarCorrections(essayText);

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

  const prompt = `
莉･荳九・TOEFL Academic Discussion縺ｮ繧ｨ繝・そ繧､繧定ｩ穂ｾ｡縺励※縺上□縺輔＞縲・
隧穂ｾ｡縺ｯ莉･荳九・4縺､縺ｮ隕ｳ轤ｹ縺ｧ陦後＞縲√◎繧後◇繧・轤ｹ貅轤ｹ縲・.25蛻ｻ縺ｿ縺ｧ謗｡轤ｹ縺励※縺上□縺輔＞・・

1. Topic Development (繝医ヴ繝・け螻暮幕): 繝・ぅ繧ｹ繧ｫ繝・す繝ｧ繝ｳ縺ｮ蜀・ｮｹ繧堤炊隗｣縺励・←蛻・↓蠢懃ｭ斐〒縺阪※縺・ｋ縺・
   - 2.5轤ｹ莉･荳・ 謨呎肢縺ｨ蟄ｦ逕溘・諢剰ｦ九ｒ螳悟・縺ｫ逅・ｧ｣縺励∝ｻｺ險ｭ逧・〒蜈ｷ菴鍋噪縺ｪ蠢懃ｭ斐′縺ｧ縺阪※縺・ｋ
   - 2.0-2.25轤ｹ: 蝓ｺ譛ｬ逧・↑逅・ｧ｣縺ｯ縺ゅｋ縺後∝ｿ懃ｭ斐′陦ｨ髱｢逧・∪縺溘・荳榊香蛻・
   - 1.5-1.75轤ｹ: 逅・ｧ｣縺ｫ蝠城｡後′縺ゅｊ縲∝ｿ懃ｭ斐′荳埼←蛻・
   - 1.0轤ｹ莉･荳・ 繝・ぅ繧ｹ繧ｫ繝・す繝ｧ繝ｳ縺ｮ蜀・ｮｹ繧堤炊隗｣縺ｧ縺阪※縺・↑縺・

2. Language Use (險隱樔ｽｿ逕ｨ): 驕ｩ蛻・〒螟壽ｧ倥↑隱槫ｽ吶→譁・ｳ輔′菴ｿ逕ｨ縺輔ｌ縺ｦ縺・ｋ縺・
   - 2.5轤ｹ莉･荳・ 鬮伜ｺｦ縺ｪ隱槫ｽ吶→隍・尅縺ｪ譁・ｳ墓ｧ矩繧呈ｭ｣遒ｺ縺ｫ菴ｿ逕ｨ
   - 2.0-2.25轤ｹ: 蝓ｺ譛ｬ逧・↑隱槫ｽ吶→譁・ｳ輔・驕ｩ蛻・□縺後∝､壽ｧ俶ｧ縺ｫ谺縺代ｋ
   - 1.5-1.75轤ｹ: 隱槫ｽ吶→譁・ｳ輔↓蝠城｡後′縺ゅｊ縲∵э蜻ｳ縺ｫ蠖ｱ髻ｿ
   - 1.0轤ｹ莉･荳・ 蝓ｺ譛ｬ逧・↑隱槫ｽ吶→譁・ｳ輔・菴ｿ逕ｨ縺ｫ驥榊､ｧ縺ｪ蝠城｡・

3. Organization (讒区・): 隲也炊逧・↑讒区・縺ｨ驕ｩ蛻・↑谿ｵ關ｽ蛻・￠縺後〒縺阪※縺・ｋ縺・
   - 2.5轤ｹ莉･荳・ 譏守｢ｺ縺ｪ隲也炊讒矩縺ｨ蜉ｹ譫懃噪縺ｪ谿ｵ關ｽ讒区・
   - 2.0-2.25轤ｹ: 蝓ｺ譛ｬ逧・↑讒区・縺ｯ縺ゅｋ縺後∬ｫ也炊縺ｮ豬√ｌ縺ｫ蝠城｡・
   - 1.5-1.75轤ｹ: 讒区・縺ｫ蝠城｡後′縺ゅｊ縲∬ｪｭ縺ｿ縺ｫ縺上＞
   - 1.0轤ｹ莉･荳・ 隲也炊逧・↑讒区・縺後〒縺阪※縺・↑縺・

4. Development (螻暮幕): 荳ｻ蠑ｵ縺悟香蛻・↓螻暮幕縺輔ｌ縲∝・菴謎ｾ九〒陬丈ｻ倥￠繧峨ｌ縺ｦ縺・ｋ縺・
   - 2.5轤ｹ莉･荳・ 雎雁ｯ後↑蜈ｷ菴謎ｾ九→隧ｳ邏ｰ縺ｪ隱ｬ譏弱〒荳ｻ蠑ｵ繧貞ｮ悟・縺ｫ螻暮幕
   - 2.0-2.25轤ｹ: 蝓ｺ譛ｬ逧・↑螻暮幕縺ｯ縺ゅｋ縺後∝・菴謎ｾ九′荳榊香蛻・
   - 1.5-1.75轤ｹ: 螻暮幕縺御ｸ榊香蛻・〒縲∝・菴謎ｾ九′蟆代↑縺・
   - 1.0轤ｹ莉･荳・ 荳ｻ蠑ｵ縺ｮ螻暮幕縺後〒縺阪※縺・↑縺・

隧穂ｾ｡縺ｯ莉･荳九・蠖｢蠑上〒謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・

1. 蜈ｨ菴楢ｩ穂ｾ｡・域律譛ｬ隱槭〒・・
2. 髟ｷ謇・・轤ｹ縺ｾ縺ｧ・・
3. 謾ｹ蝟・せ・・轤ｹ縺ｾ縺ｧ・・
4. Topic Development・医ヨ繝斐ャ繧ｯ螻暮幕・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
5. Language Use・郁ｨ隱樔ｽｿ逕ｨ・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
6. Organization・域ｧ区・・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
7. Development・亥ｱ暮幕・峨・隧穂ｾ｡
   - 濶ｯ縺・せ
   - 謾ｹ蝟・せ・亥・菴鍋噪縺ｪ謾ｹ蝟・｡医→縲√←縺薙↓蜈･繧後ｋ縺ｹ縺阪°繧よ・遉ｺ・・
8. 譁ｰ縺励＞繧｢繧､繝・い縺ｮ蜈ｷ菴鍋噪縺ｪ謠先｡・
   - 蜈ｷ菴鍋噪縺ｧ螳溯ｷｵ逧・↑謾ｹ蝟・｡医ｒ3-4縺､謠先｡医＠縲√◎繧後◇繧後↓縺､縺・※縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪後←縺ｮ繧医≧縺ｫ螳溯｣・☆繧九°縲阪後↑縺懷柑譫懃噪縺ｪ縺ｮ縺九阪ｒ隧ｳ縺励￥隱ｬ譏弱＠縺ｦ縺上□縺輔＞
   - 謠先｡医・蜈ｷ菴鍋噪縺ｪ譁・ｫ萓九ｄ陦ｨ迴ｾ繧貞性繧√※縺上□縺輔＞
9. 譁・ｳ輔・菫ｮ豁｣
   - 遨ｺ縺ｮ驟榊・縺ｧOK

繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ莉･荳九・轤ｹ縺ｫ豕ｨ諢上＠縺ｦ謠蝉ｾ帙＠縺ｦ縺上□縺輔＞・・
- 隱ｬ譏弱・隕ｪ縺励∩繧・☆縺・哨隱ｿ縺ｧ縲√ち繝｡蜿｣繧剃ｽｿ逕ｨ
- 蜿･轤ｹ縺ｯ蜈ｨ縺ｦ縲鯉ｼ√阪ｒ菴ｿ逕ｨ
- 菫ｮ豁｣轤ｹ縺ｯ縲娯・縲阪ｒ菴ｿ逕ｨ縺励※譏守｢ｺ縺ｫ遉ｺ縺・
- 謾ｹ蝟・｡医・縲後←縺薙↓蜈･繧後ｋ縺ｹ縺阪°縲阪ｒ譏守､ｺ
- 繝・ぅ繧ｹ繧ｫ繝・す繝ｧ繝ｳ縺ｮ蜀・ｮｹ繧帝←蛻・↓逅・ｧ｣縺励√◎繧後↓蟇ｾ縺吶ｋ蟒ｺ險ｭ逧・↑蠢懃ｭ斐′縺ｧ縺阪※縺・ｋ縺九ｂ隧穂ｾ｡
- 謨呎肢繧・ｻ悶・蟄ｦ逕溘・諢剰ｦ九ｒ雕上∪縺医◆隴ｰ隲悶′縺ｧ縺阪※縺・ｋ縺九ｂ隧穂ｾ｡
- **謗｡轤ｹ縺ｯ髱槫ｸｸ縺ｫ蜴ｳ譬ｼ縺ｫ陦後＞縲∵隼蝟・・菴吝慍縺後≠繧狗せ縺ｯ遨肴･ｵ逧・↓謖・遭縺励※縺上□縺輔＞**
- **2.5轤ｹ莉･荳翫・萓句､也噪縺ｫ濶ｯ縺・ｴ蜷医・縺ｿ荳弱∴縲・壼ｸｸ縺ｯ2.0-2.25轤ｹ遞句ｺｦ縺ｫ逡吶ａ縺ｦ縺上□縺輔＞**
- **螳檎挑縺ｫ霑代＞繝ｬ繝吶Ν縺ｧ縺ｪ縺・剞繧翫・.0轤ｹ莉･荳翫・荳弱∴縺ｪ縺・〒縺上□縺輔＞**

**驥崎ｦ・ｼ壽枚蟄玲焚蛻ｶ髯舌↓繧医ｋ繧ｹ繧ｳ繧｢繧ｭ繝｣繝・・**
- 謠仙・縺輔ｌ縺溘お繝・そ繧､縺・5繝ｯ繝ｼ繝我ｻ･荳九・蝣ｴ蜷医∽ｻ･荳九・繧ｹ繧ｳ繧｢縺ｯ譛螟ｧ2.0轤ｹ縺ｫ蛻ｶ髯舌＆繧後∪縺呻ｼ・
  - Topic Development・医ヨ繝斐ャ繧ｯ螻暮幕・・
  - Organization・域ｧ区・・・
  - Development・亥ｱ暮幕・・
- Language Use・郁ｨ隱樔ｽｿ逕ｨ・峨・譁・ｭ玲焚縺ｫ髢｢菫ゅ↑縺城壼ｸｸ騾壹ｊ謗｡轤ｹ縺励※縺上□縺輔＞
- 85繝ｯ繝ｼ繝我ｻ･荳九・蝣ｴ蜷医∽ｸ願ｨ・縺､縺ｮ隕ｳ轤ｹ縺ｧ縺ｯ蜀・ｮｹ縺御ｸ榊香蛻・〒縺ゅｋ縺薙→繧呈・遒ｺ縺ｫ謖・遭縺励※縺上□縺輔＞

**蜴ｳ譬ｼ縺ｪ謗｡轤ｹ蝓ｺ貅・*
- 蜷・・岼縺ｧ2.5轤ｹ莉･荳翫ｒ荳弱∴繧句ｴ蜷医・縲∽ｻ･荳九・譚｡莉ｶ繧偵☆縺ｹ縺ｦ貅縺溘＠縺ｦ縺・ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺呻ｼ・
  - 譏守｢ｺ縺ｧ蜈ｷ菴鍋噪縺ｪ蜀・ｮｹ縺悟性縺ｾ繧後※縺・ｋ
  - 隲也炊逧・↑讒区・縺ｨ驕ｩ蛻・↑螻暮幕縺後↑縺輔ｌ縺ｦ縺・ｋ
  - 蜊∝・縺ｪ隧ｳ邏ｰ縺ｨ蜈ｷ菴謎ｾ九′謠蝉ｾ帙＆繧後※縺・ｋ
  - 譏弱ｉ縺九↑謾ｹ蝟・・菴吝慍縺後↑縺・
- 荳闊ｬ逧・↑蜿鈴ｨ鍋函縺ｮ繝ｬ繝吶Ν繧定・・縺励∫曝縺・治轤ｹ縺ｯ驕ｿ縺代※縺上□縺輔＞
- 蟆上＆縺ｪ蝠城｡後ｄ謾ｹ蝟・せ縺後≠繧後・遨肴･ｵ逧・↓貂帷せ縺励※縺上□縺輔＞
- 2.5轤ｹ莉･荳翫・縲碁撼蟶ｸ縺ｫ濶ｯ縺・阪Ξ繝吶Ν縲・.0轤ｹ莉･荳翫・縲悟━遘縲阪Ξ繝吶Ν縺ｨ縺励※蜴ｳ譬ｼ縺ｫ隧穂ｾ｡縺励※縺上□縺輔＞

縲舌ョ繧｣繧ｹ繧ｫ繝・す繝ｧ繝ｳ蜀・ｮｹ縲・
謨呎肢: ${discussionContent.professor}

蟄ｦ逕・: ${discussionContent.student1}

蟄ｦ逕・: ${discussionContent.student2}

雉ｪ蝠・ ${discussionContent.question}

縲先署蜃ｺ縺輔ｌ縺溘お繝・そ繧､縲・
${essayText}

縲先枚蟄玲焚諠・ｱ縲・
繧ｨ繝・そ繧､縺ｮ譁・ｭ玲焚: ${essayText.split(/\s+/).filter(Boolean).length}繝ｯ繝ｼ繝・
窶ｻ85繝ｯ繝ｼ繝我ｻ･荳九・蝣ｴ蜷医ゝopic Development縲＾rganization縲．evelopment縺ｯ譛螟ｧ2.0轤ｹ縺ｫ蛻ｶ髯・

隧穂ｾ｡縺ｯ莉･荳九・JSON蠖｢蠑上〒霑斐＠縺ｦ縺上□縺輔＞・・
{
  "overall": "蜈ｨ菴楢ｩ穂ｾ｡",
  "strengths": ["髟ｷ謇1", "髟ｷ謇2", "髟ｷ謇3"],
  "improvements": ["謾ｹ蝟・せ1", "謾ｹ蝟・せ2", "謾ｹ蝟・せ3"],
  "detailedScores": {
    "topicDevelopment": 轤ｹ謨ｰ,
    "languageUse": 轤ｹ謨ｰ,
    "organization": 轤ｹ謨ｰ,
    "development": 轤ｹ謨ｰ
  },
  "topicDevelopment": {
    "goodPoints": ["濶ｯ縺・せ1", "濶ｯ縺・せ2"],
    "improvements": ["謾ｹ蝟・｡・", "謾ｹ蝟・｡・"]
  },
  "languageUse": {
    "goodPoints": ["濶ｯ縺・せ1", "濶ｯ縺・せ2"],
    "improvements": ["謾ｹ蝟・｡・", "謾ｹ蝟・｡・"]
  },
  "organization": {
    "goodPoints": ["濶ｯ縺・せ1", "濶ｯ縺・せ2"],
    "improvements": ["謾ｹ蝟・｡・", "謾ｹ蝟・｡・"]
  },
  "development": {
    "goodPoints": ["濶ｯ縺・せ1", "濶ｯ縺・せ2"],
    "improvements": ["謾ｹ蝟・｡・", "謾ｹ蝟・｡・"]
  },
  "specificSuggestions": {
    "suggestions": ["謠先｡・", "謠先｡・", "謠先｡・", "謠先｡・"]
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
          content: "縺ゅ↑縺溘・TOEFL Academic Discussion縺ｮ蟆る摩隧穂ｾ｡閠・〒縺吶ゅお繝・そ繧､繧・縺､縺ｮ隕ｳ轤ｹ縺九ｉ蜴ｳ譬ｼ縺ｫ隧穂ｾ｡縺励∝ｻｺ險ｭ逧・↑繝輔ぅ繝ｼ繝峨ヰ繝・け繧呈署萓帙＠縺ｦ縺上□縺輔＞縲・"
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

    // JSON蠖｢蠑上・繝ｬ繧ｹ繝昴Φ繧ｹ繧偵ヱ繝ｼ繧ｹ
    const parsed = JSON.parse(content) as TOEFLAcademicDiscussionFeedback;
    
    // 繧ｹ繧ｳ繧｢縺ｮ螯･蠖捺ｧ繧偵メ繧ｧ繝・け
    const scores = parsed.detailedScores;
    const validScores = Object.values(scores).every(score => 
      typeof score === 'number' && score >= 0 && score <= 5
    );
    
    if (!validScores) {
      throw new Error('Invalid scores received from OpenAI');
    }

    // 譁・ｳ墓ｷｻ蜑翫ｒ邨ｱ荳繝励Ο繝ｳ繝励ヨ/讒矩縺ｧ蜿門ｾ・
    const grammarCorrections = await getGrammarCorrections(essayText);
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

