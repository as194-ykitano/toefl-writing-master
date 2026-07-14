"use client";

import { useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TRANSCRIPT_HELP_VIDEO_URL =
  "https://www.loom.com/embed/a83499a8fb85485b9d1670f2033d7e4a?sid=035a70c5-5e83-4b9b-bad5-a6cb47347b5c";

export default function TranscriptHelpDialog() {
  const [open, setOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setIsVideoLoading(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-orange-200 bg-orange-50 px-2.5 text-xs font-medium text-orange-700 hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          字幕の貼り方を見る
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-orange-600" />
            YouTube字幕の貼り方
          </DialogTitle>
          <DialogDescription>
            YouTube動画の字幕・文字起こしを取得し、このページへ貼り付ける手順です。
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
            {isVideoLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-gray-100 text-gray-500">
                <Loader2 className="h-7 w-7 animate-spin text-orange-600" />
                <span className="text-sm">動画を読み込んでいます...</span>
              </div>
            )}
            {open && (
              <iframe
                src={TRANSCRIPT_HELP_VIDEO_URL}
                title="YouTube字幕の貼り方マニュアル"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
                onLoad={() => setIsVideoLoading(false)}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
