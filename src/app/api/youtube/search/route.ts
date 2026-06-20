import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const maxResults = searchParams.get('maxResults') || '10';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    // YouTube Data API v3で動画を検索
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'YouTube API error', details: data }, { status: response.status });
    }

    // 動画の詳細情報を取得（duration等）
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (!detailsResponse.ok) {
      return NextResponse.json({ error: 'YouTube API error', details: detailsData }, { status: detailsResponse.status });
    }

    // 検索結果と詳細情報をマージ（30分制限を適用）
    const videos = data.items
      .map((item: any) => {
        const details = detailsData.items.find((d: any) => d.id === item.id.videoId);
        const duration = details?.contentDetails?.duration || 'PT0S';
        const durationInSeconds = parseDuration(duration);
        const durationInMinutes = durationInSeconds / 60;
        
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          duration: duration,
          category: 'Education', // デフォルトカテゴリ
          wordCount: 0, // 後で字幕から計算
          estimatedWatchingTime: durationInSeconds,
          durationInMinutes: durationInMinutes
        };
      })
      .filter((video: any) => video.durationInMinutes <= 30); // 30分以下の動画のみフィルタリング

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// ISO 8601 durationを分に変換
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 60 + minutes + seconds / 60;
}
