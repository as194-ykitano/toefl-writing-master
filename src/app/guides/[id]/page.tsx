"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import {
  GUIDE_CATEGORY_LABELS,
  GUIDE_EXAM_LABELS,
  GUIDE_SKILL_LABELS,
  type GuideArticle,
} from "@/lib/guides";
import { getGuideManualSteps } from "@/lib/guide-manual";
import { getGuideScreenshots } from "@/lib/guide-screenshots";
import { Badge } from "@/components/ui/badge";

export default function GuideDetailPage() {
  const id = String(useParams<{ id: string }>().id);
  const defaultSteps = getGuideManualSteps(id);
  const screenshots = getGuideScreenshots(id);
  const [guide, setGuide] = useState<GuideArticle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const steps = guide?.steps ?? defaultSteps;

  useEffect(() => {
    fetch(`/api/guides?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setGuide((await response.json()).guide);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  return (
    <PrepShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href="/guides"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-eg-dark animate-in fade-in slide-in-from-left-2 duration-500"
        >
          <ArrowLeft className="h-4 w-4" />
          ガイド一覧へ
        </Link>

        {notFound ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <h1 className="text-xl font-bold">ガイドが見つかりません</h1>
            <p className="mt-2 text-sm text-slate-500">
              非公開または削除された可能性があります。
            </p>
          </div>
        ) : !guide ? (
          <div className="py-20 text-center text-slate-500">Loading...</div>
        ) : (
          <article className="overflow-hidden rounded-2xl border bg-white shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-700 dark:border-slate-700 dark:bg-slate-900">
            <header className="border-b bg-slate-50/70 px-6 py-6 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge variant="outline">{GUIDE_EXAM_LABELS[guide.exam]}</Badge>
                <Badge variant="outline">
                  {GUIDE_SKILL_LABELS[guide.skill]}
                </Badge>
                <Badge variant="secondary">
                  {GUIDE_CATEGORY_LABELS[guide.category]}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {guide.title}
              </h1>
              <p className="leading-7 text-slate-600 dark:text-slate-300">
                {guide.summary}
              </p>
            </header>

            {steps.length > 0 ? (
              <section className="border-b px-6 py-7 dark:border-slate-700 sm:px-10 sm:py-9">
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    操作手順
                  </h2>
                </div>
                <ol className="space-y-10">
                  {steps.map((step, index) => (
                    <li
                      key={step.key}
                      className="relative border-l-2 border-orange-200 pl-6 animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both sm:pl-8"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <span className="absolute -left-4 top-0 grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-sm font-black text-white shadow-sm">
                        {index + 1}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {step.title}
                      </h3>
                      <p className="mb-4 mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {step.description}
                      </p>
                      {step.comingSoon ? (
                        <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 px-6 py-10 text-center text-lg font-bold text-orange-700 dark:border-orange-700 dark:bg-orange-950/20 dark:text-orange-300">
                          Coming Soon
                        </div>
                      ) : step.src ? (
                        <figure>
                          <img
                            src={step.src}
                            alt={`${step.title}の画面`}
                            loading="lazy"
                            className="h-auto w-full rounded-xl border bg-white object-contain shadow-sm dark:border-slate-700"
                          />
                          {step.details?.length ? (
                            <div className="mt-4 rounded-xl bg-slate-50 px-5 py-4 dark:bg-slate-800/70">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                この画面で確認すること
                              </h4>
                              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {step.details.map((detail) => (
                                  <li key={detail} className="flex gap-2">
                                    <span className="text-orange-500">●</span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </figure>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : screenshots.length > 0 ? (
              <section className="border-b px-6 py-6 dark:border-slate-700 sm:px-10 sm:py-8">
                <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-50">
                  画面の見方
                </h2>
                <div className="space-y-7">
                  {screenshots.map((screenshot, index) => (
                    <figure
                      key={screenshot.src}
                      className="animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <img
                        src={screenshot.src}
                        alt={screenshot.alt}
                        className="max-h-[720px] w-full rounded-xl border bg-white object-contain shadow-sm dark:border-slate-700"
                      />
                      <figcaption className="mt-2 text-center text-xs text-slate-500">
                        {screenshot.alt}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            {steps.length === 0 && (
              <div className="px-6 py-6 sm:px-10 sm:py-8">
                <GuideMarkdown content={guide.content} />
              </div>
            )}
          </article>
        )}
      </main>
    </PrepShell>
  );
}
