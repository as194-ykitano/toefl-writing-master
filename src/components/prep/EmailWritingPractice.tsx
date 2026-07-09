"use client";

// TOEFL Write an Email 演習画面
// 状況説明 + 要件を読み、制限時間内にメールを書いて AI 添削を受ける

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExamTopBar } from "./exam-ui";
import { EmailWritingSet, EXAM_LABELS, PracticeMode } from "@/lib/prep/types";

interface EmailFeedback {
  bandEstimate?: number;
  summary?: string;
  requirementsCheck?: string[];
  strengths?: string[];
  improvements?: string[];
  improvedVersion?: string;
  error?: string;
}

interface EmailWritingPracticeProps {
  set: EmailWritingSet;
  mode: PracticeMode;
}

export default function EmailWritingPractice({ set, mode }: EmailWritingPracticeProps) {
  const [email, setEmail] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<EmailFeedback | null>(null);
  const [showSample, setShowSample] = useState(false);

  const finished = feedback !== null;
  const exitHref = `/practice/${set.exam}/writing?type=write-an-email`;
  const wordCount = useMemo(
    () => email.trim().split(/\s+/).filter(Boolean).length,
    [email]
  );
  const remainingSec = mode === "test" ? Math.max(0, set.timeLimitSec - elapsedSec) : 0;

  useEffect(() => {
    if (finished || submitting) return;
    const timer = setInterval(() => setElapsedSec((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [finished, submitting]);

  const handleSubmit = async () => {
    if (submitting || finished || email.trim().length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: set.promptText,
          emailText: email,
          to: set.to,
          subject: set.subject,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "添削に失敗しました");
      setFeedback(json);
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : "添削に失敗しました" });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ExamTopBar
        examLabel={EXAM_LABELS[set.exam]}
        title={set.title}
        mode={mode}
        elapsedSec={elapsedSec}
        remainingSec={remainingSec}
        exitHref={exitHref}
      />

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左: 問題 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase mb-3">
            Write an Email
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{set.promptText}</p>
          {(set.to || set.subject) && (
            <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-700 space-y-1">
              {set.to && (
                <div>
                  <span className="text-gray-400">To:</span> {set.to}
                </div>
              )}
              {set.subject && (
                <div>
                  <span className="text-gray-400">Subject:</span> {set.subject}
                </div>
              )}
            </div>
          )}
          {set.promptJa && (
            <details className="mt-4">
              <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
                日本語訳を表示
              </summary>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {set.promptJa}
              </p>
            </details>
          )}
        </div>

        {/* 右: 回答 / フィードバック */}
        <div className="space-y-4">
          {!finished ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-700">Your Response</div>
                <div className={`text-xs ${wordCount >= 80 ? "text-emerald-600" : "text-gray-400"}`}>
                  {wordCount} words（目安 80〜120 語）
                </div>
              </div>
              <Textarea
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Dear ..., "
                disabled={submitting}
                className="min-h-[20rem] text-sm leading-relaxed"
              />
              <Button
                className="mt-4 bg-eg hover:bg-eg-dark text-black self-end"
                onClick={handleSubmit}
                disabled={submitting || email.trim().length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> AI 添削中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" /> Submit for AI Feedback
                  </>
                )}
              </Button>
            </div>
          ) : feedback.error ? (
            <div className="bg-white rounded-2xl border border-red-200 p-6 text-sm text-red-600">
              添削エラー: {feedback.error}
              <div className="mt-4">
                <Button variant="outline" onClick={() => setFeedback(null)}>
                  回答画面に戻る
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-eg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                  <h2 className="font-semibold text-gray-900">AI フィードバック</h2>
                  {feedback.bandEstimate !== undefined && (
                    <span className="ml-auto text-xs font-bold text-eg-deep bg-eg-soft rounded-full px-3 py-1">
                      推定 Band {Number(feedback.bandEstimate).toFixed(1)} / 6
                    </span>
                  )}
                </div>
                {feedback.summary && (
                  <p className="text-sm text-gray-700 leading-relaxed">{feedback.summary}</p>
                )}
                {feedback.requirementsCheck && feedback.requirementsCheck.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {feedback.requirementsCheck.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(feedback.strengths ?? []).length > 0 && (
                    <div className="bg-emerald-50/60 rounded-lg border border-emerald-100 px-4 py-3">
                      <div className="text-[11px] font-semibold text-emerald-700 mb-1.5">良かった点</div>
                      <ul className="space-y-1">
                        {feedback.strengths!.map((s) => (
                          <li key={s} className="text-xs text-gray-700 leading-relaxed">
                            ✓ {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(feedback.improvements ?? []).length > 0 && (
                    <div className="bg-eg-faint rounded-lg border border-eg-soft px-4 py-3">
                      <div className="text-[11px] font-semibold text-eg-deep mb-1.5">改善ポイント</div>
                      <ul className="space-y-1">
                        {feedback.improvements!.map((s) => (
                          <li key={s} className="text-xs text-gray-700 leading-relaxed">
                            → {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {feedback.improvedVersion && (
                  <div className="mt-3 bg-violet-50/60 rounded-lg border border-violet-100 px-4 py-3">
                    <div className="text-[11px] font-semibold text-violet-700 mb-1">改善版メール</div>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line italic">
                      {feedback.improvedVersion}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="text-xs font-semibold text-gray-400 mb-2">あなたの回答</div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{email}</p>
              </div>

              {set.sampleAnswer && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <button
                    onClick={() => setShowSample((v) => !v)}
                    className="text-xs font-semibold text-eg-deep hover:text-eg-dark"
                  >
                    {showSample ? "解答例を隠す" : "解答例を表示"}
                  </button>
                  {showSample && (
                    <p className="mt-3 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {set.sampleAnswer}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Link
                  href={exitHref}
                  className="inline-flex items-center rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3"
                >
                  一覧に戻る
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
