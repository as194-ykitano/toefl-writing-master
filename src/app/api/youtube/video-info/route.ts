import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID parameter is required' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    // YouTube Data API v3で動画の詳細情報を取得
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
    
    const response = await fetch(videoUrl);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'YouTube API error', details: data }, { status: response.status });
    }

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoData = data.items[0];
    const snippet = videoData.snippet;
    const contentDetails = videoData.contentDetails;

    // 動画情報を整形
    const video = {
      id: videoId,
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      thumbnailUrl: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      duration: contentDetails.duration || 'PT0S',
      category: 'Education', // デフォルトカテゴリ
      wordCount: 0, // 後で字幕から計算
      estimatedWatchingTime: parseDuration(contentDetails.duration || 'PT0S')
    };

    return NextResponse.json({ video });
  } catch (error) {
    console.error('YouTube video info error:', error);
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
