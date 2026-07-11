"use client";

import { GraduationCap, Users, FileText, Video, Play } from "lucide-react";
import { useState } from "react";
import PrepShell from "@/components/prep/PrepShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function UsageGuidePage() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>("56.25%"); // デフォルトは16:9

  // 動画のアスペクト比を抽出する関数
  const extractAspectRatio = (videoHtml: string): string => {
    const match = videoHtml.match(/padding-bottom:\s*(\d+\.?\d*)%/);
    return match ? `${match[1]}%` : "56.25%";
  };

  const sections = [
    {
      id: 'introduction',
      title: 'まずはじめに - Prep Master',
      icon: Play,
      color: 'blue',
      video: '<div style="position: relative; padding-bottom: 49.11366006256517%; height: 0;"><iframe src="https://www.loom.com/embed/c82d1ccc18a04103a6693fc09488758b?sid=a838c7b6-0039-415f-92fc-f73e1b8dedf5" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>'
    },
    {
      id: 'toefl-integrated',
      title: 'TOEFL Integrated Task',
      icon: GraduationCap,
      color: 'blue',
      video: '<div style="position: relative; padding-bottom: 49.11366006256517%; height: 0;"><iframe src="https://www.loom.com/embed/a328e75fa32448159479938a3c8b6d08?sid=fdcc4c19-4224-4dee-9626-c7082b4bd89d" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>'
    },
    {
      id: 'toefl-academic-discussion',
      title: 'TOEFL Academic Discussion',
      icon: Users,
      color: 'blue',
      video: '<div style="position: relative; padding-bottom: 49.11366006256517%; height: 0;"><iframe src="https://www.loom.com/embed/6fe0c69e41164883916c6f12bee182c5?sid=f1e7728e-773f-45a1-bb03-2c4c3eb3120c" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>'
    },
    {
      id: 'ielts',
      title: 'IELTSトレーニング',
      icon: GraduationCap,
      color: 'emerald',
      video: '<div style="position: relative; padding-bottom: 49.11366006256517%; height: 0;"><iframe src="https://www.loom.com/embed/da30f1d3fa074951ade0468cd3650451?sid=bc8c9fcf-4b0b-4006-9084-a3cda4ee6bc1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>'
    },
    {
      id: 'basic',
      title: 'Basicトレーニング',
      icon: FileText,
      color: 'violet',
      video: '<div style="position: relative; padding-bottom: 49.11366006256517%; height: 0;"><iframe src="https://www.loom.com/embed/2f84f66174b0490ba3f6cc2108eeb2b9?sid=e6ac1ba4-2509-48f6-a31c-bb4b3aa7e03d" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>'
    },
    {
      id: 'youtuber',
      title: 'YouTube Learning',
      icon: Video,
      color: 'red',
      video: '<div style="position: relative; padding-bottom: 49.16666666666667%; height: 0;"><iframe src="https://www.loom.com/embed/2f117f99c7f84afda1ffa4b5829d9d71?sid=4fe34ddf-c546-4589-ad06-5c72a8cbb8fc" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>'
    }
  ];

  const iconTint: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* ヘッダー */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-3 duration-700">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-3">
            使い方ガイド
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            Prep Masterの各機能の使い方を動画で確認できます
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            カードのどこをクリックしても動画を確認できます
          </p>
        </div>

        {/* セクション一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section, i) => {
            const IconComponent = section.icon;
            return (
              <div
                key={section.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group relative rounded-2xl border border-gray-200/80 bg-white p-5 cursor-pointer transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-gray-700 animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"
                onClick={() => {
                  setSelectedVideo(section.video);
                  setVideoAspectRatio(extractAspectRatio(section.video));
                  setIsVideoLoading(true);
                  setTimeout(() => {
                    setIsVideoLoading(false);
                  }, 3000);
                }}
              >
                {/* アイコン */}
                <div className="mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${iconTint[section.color]}`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>

                {/* タイトル */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">
                  {section.title}
                </h3>

                {/* 動画を見るボタン */}
                <div className="flex items-center text-gray-500 dark:text-gray-400 group-hover:text-eg-deep dark:group-hover:text-eg transition-colors duration-200">
                  <Play className="w-3 h-3 mr-2" />
                  <span className="text-xs font-medium">動画を見る</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 動画モーダル */}
      <Dialog open={!!selectedVideo} onOpenChange={() => {
        setSelectedVideo(null);
        setIsVideoLoading(false);
      }}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>使い方動画</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="p-4">
              {isVideoLoading && (
                <div
                  className="relative bg-gray-50 dark:bg-gray-800 rounded-lg"
                  style={{ paddingBottom: videoAspectRatio, height: 0 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto animate-spin"></div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-lg">動画を読み込み中...</p>
                    </div>
                  </div>
                </div>
              )}
              <div
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
                style={{ display: isVideoLoading ? 'none' : 'block' }}
                dangerouslySetInnerHTML={{ __html: selectedVideo }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PrepShell>
  );
}
