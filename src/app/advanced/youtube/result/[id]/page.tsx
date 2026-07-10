"use client";

// YouTube Writing 添削結果ページ（後から見返せる）
// localStorage（youtube-store）に保存した結果を読み込んで表示する。

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ArrowLeft, Youtube } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import YouTubeFeedbackView from "@/components/prep/YouTubeFeedbackView";
import { loadYouTubeResult, YouTubeWritingResult } from "@/lib/prep/youtube-store";

export default function YouTubeResultPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<YouTubeWritingResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setResult(loadYouTubeResult(id));
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return (
      <PrepShell>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">読み込み中...</div>
      </PrepShell>
    );
  }

  if (!result) {
    return (
      <PrepShell>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">添削結果が見つかりませんでした。</p>
          <p className="text-xs text-gray-400 mt-2">
            結果はこのブラウザに保存されます。別の端末・ブラウザでは表示できません。
          </p>
          <Link href="/advanced/youtube" className="inline-block mt-4 text-eg-deep hover:underline text-sm">
            YouTube Writing に戻る
          </Link>
        </div>
      </PrepShell>
    );
  }

  return (
    <PrepShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/advanced/youtube"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> YouTube Writing に戻る
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase bg-red-50 text-red-600 rounded px-2 py-1">
            YouTube Writing
          </span>
          <span className="text-xs text-gray-400">
            {result.taskType === "summary" ? "Summary" : "Opinion"} ・{" "}
            {new Date(result.finishedAt).toLocaleString("ja-JP")} ・ {result.wordCount} words
          </span>
        </div>

        {/* 動画情報 */}
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
          {result.videoThumbnail && (
            <Image
              src={result.videoThumbnail}
              alt=""
              width={160}
              height={90}
              unoptimized
              className="w-40 h-auto rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 leading-snug">{result.videoTitle}</div>
            {result.channelTitle && <div className="mt-1 text-xs text-gray-400">{result.channelTitle}</div>}
            {result.videoUrl && (
              <a
                href={result.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <Youtube className="w-3.5 h-3.5" /> YouTube で見る
              </a>
            )}
          </div>
        </div>

        {/* 提出した回答 */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">あなたの回答</h2>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{result.essay}</p>
        </div>

        {/* フィードバック */}
        <div className="mt-4">
          <YouTubeFeedbackView
            feedback={result.feedback}
            essay={result.essay}
            taskType={result.taskType}
          />
        </div>
      </div>
    </PrepShell>
  );
}
