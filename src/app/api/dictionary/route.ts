import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  try {
    // ここで実際の辞書APIを呼び出す
    // 例: Google Translate API, Oxford Dictionary API, など
    // 現在はダミーデータを返す
    
    // 実際の実装例（Google Translate APIを使用する場合）:
    /*
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: word,
          source: 'en',
          target: 'ja',
          format: 'text'
        })
      }
    );
    
    const data = await response.json();
    const meaning = data.data.translations[0].translatedText;
    */

    // ダミーデータ（実際の実装では上記のAPIを使用）
    const dummyMeanings: { [key: string]: string } = {
      'important': '重要な、大切な',
      'significant': '重要な、意義深い',
      'crucial': '決定的な、重要な',
      'essential': '不可欠な、本質的な',
      'fundamental': '基本的な、根本的な',
      'comprehensive': '包括的な、総合的な',
      'thorough': '徹底的な、詳細な',
      'extensive': '広範囲な、大規模な',
      'substantial': '実質的な、相当な',
      'considerable': 'かなりの、相当な'
    };

    const meaning = dummyMeanings[word.toLowerCase()] || `${word}の意味を検索中...`;

    return NextResponse.json({ meaning });
  } catch (error) {
    console.error('Dictionary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meaning' },
      { status: 500 }
    );
  }
} 