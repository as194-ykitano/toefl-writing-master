import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getGrammarCorrectionsV2 } from '@/lib/openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeYouTuberFeedback(taskType: 'summary' | 'opinion', raw: unknown) {
  const feedback = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const grammarCorrectionsRaw = feedback.grammarCorrections;

  const grammarCorrections = Array.isArray(grammarCorrectionsRaw)
    ? { corrections: grammarCorrectionsRaw }
    : (
        grammarCorrectionsRaw &&
        typeof grammarCorrectionsRaw === 'object' &&
        'corrections' in grammarCorrectionsRaw &&
        Array.isArray((grammarCorrectionsRaw as { corrections?: unknown }).corrections)
      )
      ? grammarCorrectionsRaw
      : { corrections: [] };

  return {
    ...(taskType === 'summary'
      ? {
          summaryQuality: feedback.summaryQuality ?? {
            goodPoints: [],
            improvements: [],
            suggestions: [],
          },
        }
      : {
          opinionQuality: feedback.opinionQuality ?? {
            goodPoints: [],
            improvements: [],
            suggestions: [],
          },
        }),
    grammarCorrections,
    sampleAnswer: typeof feedback.sampleAnswer === 'string' ? feedback.sampleAnswer : '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const { essayText, videoTitle, videoDescription, taskType, transcript } = await request.json();

    if (!essayText) {
      return NextResponse.json({ error: 'エッセイテキストが必要です' }, { status: 400 });
    }

    // タスクタイプに応じてプロンプトを調整
    let prompt = '';
    
    if (taskType === 'summary') {
      prompt = `あなたはYouTube動画の要約について学生にフィードバックを提供する専門の英語教師です。

動画タイトル: ${videoTitle || 'N/A'}
動画の説明: ${videoDescription || 'N/A'}
${transcript ? `動画の文字起こし: ${transcript}` : ''}

学生の要約:
${essayText}

以下の点に焦点を当てて詳細なフィードバックを提供してください：
1. 学生が動画の要点をどれだけうまく捉えているか
2. 要約の正確性
3. 要約の構成と構造
4. 言語の使用と文法
5. 改善の提案

**超重要：必ず、動画の文字起こし（Transcript）と学生の要約（Student）を比較・照合したうえで評価してください。各主張には短い根拠の引用を付けてください（T: "..." / S: "..." の形式、各10〜25語程度で十分）。Transcriptに存在しない内容を事実として断定しないでください。**

**重要：summaryQualityの評価では、学生のエッセイから具体的な英文や英語のフレーズを引用しながら説明し、可能な限りTranscript側の対応箇所も併記してください（例：T: "..." / S: "...")。**

**乖離の指摘：Studentの要約内容がTranscriptと大きく乖離している場合は、その乖離を明確に指摘し、どの点が異なるのかを短い引用で示してください（例：T: "..." / S: "..."）。**

 生成手順：
 1) まずTranscriptのみを根拠に、英語のSampleAnswer（要約）を作成してください（Studentの誤りは参照しない）。
 2) 次に、Studentの要約とTranscriptおよびSampleAnswerを比較し、summaryQualityを評価してください。合致点と相違点をT/S引用で根拠づけてください。

 以下のJSON形式でフィードバックを提供してください：
 {
   "summaryQuality": {
     "goodPoints": ["動画の要点を正確に捉えている（例：'The video explains three main benefits of renewable energy'のように具体的に）", "重要な情報が適切に含まれている（例：統計データや専門用語を正確に引用）", "要約の構成が明確である（例：導入→本論→結論の流れが分かりやすい）"],
     "improvements": ["より具体的な例を追加する（例：'The speaker mentions several benefits'ではなく'The speaker mentions three specific benefits: cost reduction, environmental impact, and job creation'）", "動画の流れに沿った構成にする（例：時系列や論理的な順序で整理）", "重要なポイントを強調する（例：キーワードや数値を太字や引用符で強調）"],
     "suggestions": ["動画の冒頭と結論を重点的に要約する（例：'The video begins by stating...' 'In conclusion, the speaker emphasizes...'）", "数値やデータがあれば含める（例：'According to the video, 75% of participants...'）", "要約の最後に全体のまとめを追加する（例：'Overall, the video presents a comprehensive view of...'）"]
   },
  "grammarCorrections": {
     "corrections": [
       {
         "original": "誤りのある単語やフレーズのみ",
         "corrected": "修正後の単語やフレーズのみ",
         "explanation": "修正の説明（日本語で、親しみやすい口調で）",
         "context": "誤りを含む完全な文",
         "startIndex": 0,
         "endIndex": 0
       }
     ]
   },
  "sampleAnswer": "Please provide a better summary example developed from the student's submission. The sample must be strictly faithful to the Transcript facts and reflect the improvements. If the Student's content significantly diverges from the Transcript (e.g., different topic or invented facts), ignore the Student's incorrect content and write a correct summary based solely on the Transcript. Do not add facts not present in the Transcript."
 }`;
    } else if (taskType === 'opinion') {
      prompt = `あなたはYouTube動画についての意見エッセイについて学生にフィードバックを提供する専門の英語教師です。

動画タイトル: ${videoTitle || 'N/A'}
動画の説明: ${videoDescription || 'N/A'}
${transcript ? `動画の文字起こし: ${transcript}` : ''}

学生の意見エッセイ:
${essayText}

以下の点に焦点を当てて詳細なフィードバックを提供してください：
1. 学生が自分の意見をどれだけうまく表現しているか
2. 論拠と推論の強さ
3. 意見と動画コンテンツの関連性
4. エッセイの構成と構造
5. 言語の使用と文法
6. 改善の提案

**超重要：必ず、動画の文字起こし（Transcript）と学生の意見エッセイ（Student）を比較・照合したうえで評価してください。主張や論拠の妥当性についてはTranscript該当箇所を根拠にしてください。各主張に短い引用（T: "..." / S: "..."）を含めてください。Transcriptにない内容を事実として持ち込まないでください。**

**重要：opinionQualityの評価では、学生のエッセイから具体的な英文や英語のフレーズを引用し、可能な限りTranscript側の対応箇所も併記してください（T: "..." / S: "...")。**

**乖離の指摘：Studentの意見や主張がTranscriptの内容と大きく乖離している場合は、その乖離を明確に指摘し、どの点が異なるのかを短い引用で示してください（例：T: "..." / S: "..."）。**

 生成手順：
 1) まずTranscriptのみを根拠に、英語のSampleAnswer（意見エッセイ）を作成してください（Studentの誤りは参照しない）。
 2) 次に、Studentの意見エッセイとTranscriptおよびSampleAnswerを比較し、opinionQualityを評価してください。合致点と相違点をT/S引用で根拠づけてください。

 以下のJSON形式でフィードバックを提供してください：
 {
   "opinionQuality": {
     "goodPoints": ["明確な立場を表明している（例：'I strongly agree with the speaker's view that...'のように明確に）", "動画内容に基づいた具体的な論拠がある（例：'The speaker's example of renewable energy in Germany supports my argument because...'）", "論理的な構成で意見を展開している（例：主張→理由→具体例→結論の流れ）"],
     "improvements": ["より具体的な例や体験を追加する（例：'I have experienced this personally when...' 'For instance, in my country...'）", "反対意見への反駁を含める（例：'Some may argue that..., but I believe...' 'While it is true that..., the evidence shows...'）", "結論をより強く印象付ける（例：'Therefore, it is clear that...' 'In light of these points, I am convinced that...'）"],
     "suggestions": ["動画の内容と自分の経験を結びつける（例：'This reminds me of when I...' 'Similar to the speaker's example...'）", "統計やデータを活用して説得力を高める（例：'According to recent studies, 80% of people...' 'Research shows that...'）", "感情的な表現と論理的な論証のバランスを取る（例：'I am deeply concerned about...'と'Furthermore, the data indicates...'を組み合わせる）"]
   },
  "grammarCorrections": {
     "corrections": [
       {
         "original": "誤りのある単語やフレーズのみ",
         "corrected": "修正後の単語やフレーズのみ",
         "explanation": "修正の説明（日本語で、親しみやすい口調で）",
         "context": "誤りを含む完全な文",
         "startIndex": 0,
         "endIndex": 0
       }
     ]
   },
  "sampleAnswer": "Please provide a better opinion essay developed from the student's submission. Align claims with the Transcript; do not invent facts beyond the Transcript. If the Student's content significantly diverges from the Transcript (e.g., different topic or invented facts), ignore the Student's incorrect content and write a correct opinion essay based solely on the Transcript. Keep the student's strong points while addressing improvements."
 }`;
    } else {
      return NextResponse.json({ error: '無効なタスクタイプです。summaryまたはopinionを指定してください。' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは英語の専門教師です。学生のエッセイに対してフィードバックを提供してください。

学生はYouTube動画の要約・意見エッセイを書きました。回答を作成する際は、常に以下を厳守してください：
- SummaryQuality / OpinionQuality / SampleAnswer は、必ず動画の文字起こし（Transcript）と学生のエッセイ（Student）を比較した結果に基づいて作成すること。
 - SampleAnswerは必ずTranscriptのみから先に作成する（Studentは参照しない）。その後、Studentの内容をTranscriptおよびSampleAnswerと比較してSummaryQuality / OpinionQualityを評価すること。
- 主要な主張・評価には、短い引用を添えること（形式：T: "..." / S: "..."、各10〜25語程度）。引用は短く、正確に。
- Transcriptに存在しない事実の追加や、推測での補完（ハルシネーション）は禁止。わからない場合は不確実性を明示。
- SampleAnswerは英語で、Transcriptの事実に忠実に。Studentの良い点を活かし、改善点を反映する。Transcript外の新事実は入れない。Studentの内容がTranscriptと大きく乖離している場合は、その乖離を明確に指摘した上で、Studentの誤りは無視し、Transcriptの内容のみから正しいサマリーを作成する。

以下の点に焦点を当てて建設的なフィードバックを提供してください：
1. 全体的な印象と主な長所
2. 改善点
3. 文法修正と説明（これが主な焦点）
4. より良いライティングのための具体的な提案

主に文法の正確性、文構造、言語使用に焦点を当ててください。励ましつつも正直に評価し、可能な限りテキストから具体的な例を提供してください。

**重要：フィードバック（grammarCorrections, summaryQuality, opinionQuality）は日本語で提供してください。親しみやすい口調（タメ口）を使用し、句点は「！」を使用してください。ただし、sampleAnswerのみ英語で提供してください。**

**文法添削について：最低5個以上の具体的な文法修正を提供してください。エッセイの長さに応じて、より多くの添削を含めてください。

重要：originalとcorrectedフィールドには、誤りのある単語やフレーズのみを記載してください。文章全体ではなく、修正が必要な部分だけを抽出してください。contextフィールドには、誤りを含む完全な文を記載してください。**`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 5000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // JSONレスポンスをパースして検証
    try {
      const parsedFeedback = JSON.parse(responseText);
      const feedback = normalizeYouTuberFeedback(taskType, parsedFeedback);

      try {
        const grammarCorrections = await getGrammarCorrectionsV2(essayText);
        feedback.grammarCorrections = {
          corrections: grammarCorrections?.corrections.map((correction) => ({
            original: correction.original,
            corrected: correction.corrected,
            explanation: correction.explanation,
            context: correction.context,
            startIndex: correction.startIndex,
            endIndex: correction.endIndex,
          })) || [],
        };
      } catch (grammarError) {
        console.error('Error generating grammar corrections for YouTuber essay:', grammarError);
      }

      return NextResponse.json(feedback);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      
      // パースエラーの場合は、フォールバックレスポンスを返す
      return NextResponse.json({
        summaryQuality: {
          goodPoints: ["コンテンツを要約しようと努力しました"],
          improvements: ["より具体的で整理された要約を心がけてください"],
          suggestions: ["動画の要点を整理して要約してください", "重要な情報を抜け漏れなく含めてください"]
        },
        opinionQuality: {
          goodPoints: ["トピックについて自分の考えを共有しました"],
          improvements: ["論拠をもっと詳しく展開してください"],
          suggestions: ["動画の内容と自分の経験を結びつけてください", "具体的な例を追加してください"]
        },
        grammarCorrections: {
          corrections: []
        },
        sampleAnswer: "I apologize, but there is currently a system error and I cannot generate a sample answer. Please try again later."
      });
    }
  } catch (error) {
    console.error('Error analyzing YouTuber essay:', error);
    return NextResponse.json({ error: 'エッセイの分析に失敗しました' }, { status: 500 });
  }
}
