"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function GuideMarkdown({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    h1: ({ children }) => <h1 className="mb-5 mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-3 mt-9 border-b pb-2 text-xl font-bold text-slate-900 dark:border-slate-700 dark:text-slate-50">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50">{children}</h3>,
    p: ({ children }) => <p className="my-3 leading-8 text-slate-700 dark:text-slate-300">{children}</p>,
    ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-300">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-3 pl-6 text-slate-700 dark:text-slate-300">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
    img: ({ src, alt }) => <figure className="my-7"><img src={typeof src === "string" ? src : ""} alt={alt ?? "ガイド画像"} className="max-h-[720px] w-full rounded-xl border bg-white object-contain shadow-sm dark:border-slate-700"/><figcaption className="mt-2 text-center text-xs text-slate-500">{alt}</figcaption></figure>,
    table: ({ children }) => <div className="my-5 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
    th: ({ children }) => <th className="border bg-slate-50 px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-800">{children}</th>,
    td: ({ children }) => <td className="border px-3 py-2 dark:border-slate-700">{children}</td>,
  }}>{content}</ReactMarkdown>;
}
