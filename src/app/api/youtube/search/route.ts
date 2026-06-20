import { NextRequest, NextResponse } from 'next/server';

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeVideoDetail {
  id: string;
  contentDetails?: {
    duration?: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoDetailsResponse {
  items?: YouTubeVideoDetail[];
}

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

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`;
    const response = await fetch(searchUrl);
    const data = (await response.json()) as YouTubeSearchResponse;

    if (!response.ok) {
      return NextResponse.json({ error: 'YouTube API error', details: data }, { status: response.status });
    }

    const searchItems = data.items ?? [];
    if (searchItems.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    const videoIds = searchItems.map((item) => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = (await detailsResponse.json()) as YouTubeVideoDetailsResponse;

    if (!detailsResponse.ok) {
      return NextResponse.json({ error: 'YouTube API error', details: detailsData }, { status: detailsResponse.status });
    }

    const detailItems = detailsData.items ?? [];
    const videos = searchItems
      .map((item) => {
        const details = detailItems.find((detail) => detail.id === item.id.videoId);
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
          duration,
          category: 'Education',
          wordCount: 0,
          estimatedWatchingTime: durationInSeconds,
          durationInMinutes,
        };
      })
      .filter((video) => video.durationInMinutes <= 30);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}
