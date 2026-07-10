// YouTube Writing 添削結果の保存・読み込み（他の Writing と同様に localStorage）
// 後から /advanced/youtube/result/[id] で見返せるようにする。

import { WritingGrammarCorrection } from "./types";

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

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadYouTubeResults(): YouTubeWritingResult[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadYouTubeResult(id: string): YouTubeWritingResult | null {
  return loadYouTubeResults().find((r) => r.id === id) ?? null;
}

export function saveYouTubeResult(result: YouTubeWritingResult): void {
  if (!isBrowser()) return;
  const results = loadYouTubeResults().filter((r) => r.id !== result.id);
  results.unshift(result);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 50)));
}

export function deleteYouTubeResult(id: string): void {
  if (!isBrowser()) return;
  const results = loadYouTubeResults().filter((r) => r.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function newYouTubeResultId(): string {
  return `yt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
