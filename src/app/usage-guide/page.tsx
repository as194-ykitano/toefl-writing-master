"use client";

import { GraduationCap, Users, FileText, Video, Play } from "lucide-react";
import { useState } from "react";
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
      title: 'まずはじめに - Writing Master',
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-gray-900 mb-4 tracking-tight">
            使い方ガイド
          </h1>
          <p className="text-gray-500 text-sm font-light mb-2">
            Writing Masterの各機能の使い方を動画で確認できます
          </p>
          <p className="text-gray-400 text-xs">
            カードのどこをクリックしても動画を確認できます
          </p>
        </div>

        {/* セクション一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <div
                key={section.id}
                className={`group relative border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer ${
                  section.id === 'introduction' ? 'bg-gray-50' : 'bg-white'
                }`}
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
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-3
                    ${section.color === 'blue' ? 'bg-blue-50' : ''}
                    ${section.color === 'emerald' ? 'bg-emerald-50' : ''}
                    ${section.color === 'violet' ? 'bg-violet-50' : ''}
                    ${section.color === 'red' ? 'bg-red-50' : ''}
                  `}>
                    <IconComponent className={`
                      w-6 h-6
                      ${section.color === 'blue' ? 'text-blue-600' : ''}
                      ${section.color === 'emerald' ? 'text-emerald-600' : ''}
                      ${section.color === 'violet' ? 'text-violet-600' : ''}
                      ${section.color === 'red' ? 'text-red-600' : ''}
                    `} />
                  </div>
                </div>

                {/* タイトル */}
                <h3 className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
                  {section.title}
                </h3>

                {/* 動画を見るボタン */}
                <div className="flex items-center text-gray-500 group-hover:text-gray-700 transition-colors duration-200">
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
                  className="relative bg-gray-50 rounded-lg"
                  style={{ paddingBottom: videoAspectRatio, height: 0 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto animate-spin"></div>
                      </div>
                      <p className="text-gray-600 text-lg">動画を読み込み中...</p>
                    </div>
                  </div>
                </div>
              )}
              <div 
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                style={{ display: isVideoLoading ? 'none' : 'block' }}
                dangerouslySetInnerHTML={{ __html: selectedVideo }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
