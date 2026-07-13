// YouTube Writing 添削結果の保存・読み込み（他の Writing と同様に localStorage）
// 後から /advanced/youtube/result/[id] で見返せるようにする。

import { WritingGrammarCorrection } from "./types";
import { readStore, writeStore } from "./user-scope";

export interface YouTubeQualityBlock {
  goodPoints: string[];
  improvements: string[];
  suggestions: string[];
}

export interface YouTuberFeedback {
  summaryQuality?: YouTubeQualityBlock;
  opinionQuality?: YouTubeQualityBlock;
  grammarCorrections?: { corrections?: WritingGrammarCorrection[] };
  sampleAnswer?: string;
}

export type YouTubeTaskType = "summary" | "opinion";

export interface YouTubeWritingResult {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail?: string;
  videoUrl?: string;
  channelTitle?: string;
  taskType: YouTubeTaskType;
  essay: string;
  wordCount: number;
  finishedAt: string; // ISO
  feedback: YouTuberFeedback;
}

const STORAGE_KEY = "prep_youtube_results_v1";

export function loadYouTubeResults(): YouTubeWritingResult[] {
  return readStore<YouTubeWritingResult>(STORAGE_KEY);
}

export function loadYouTubeResult(id: string): YouTubeWritingResult | null {
  return loadYouTubeResults().find((r) => r.id === id) ?? null;
}

export function saveYouTubeResult(result: YouTubeWritingResult): void {
  const results = loadYouTubeResults().filter((r) => r.id !== result.id);
  results.unshift(result);
  writeStore(STORAGE_KEY, results.slice(0, 50));
}

export function deleteYouTubeResult(id: string): void {
  const results = loadYouTubeResults().filter((r) => r.id !== id);
  writeStore(STORAGE_KEY, results);
}

export function newYouTubeResultId(): string {
  return `yt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
