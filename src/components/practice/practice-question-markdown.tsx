"use client"

import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

import { normalizePracticeQuestionText } from "@/lib/practice-question-text"
import { cn } from "@/lib/utils"
import { richMediaMarkdownComponents } from "@/components/practice/rich-markdown-components"

const QUESTION_MARKDOWN_CLASSNAME =
  "min-w-0 text-sm leading-6 select-text [&_a]:break-all [&_a]:text-primary [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1:first-child]:mt-0 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-semibold [&_h5]:mb-1 [&_h5]:mt-2 [&_h5]:text-sm [&_h5]:font-semibold [&_h6]:mb-1 [&_h6]:mt-2 [&_h6]:text-sm [&_h6]:font-semibold [&_hr]:my-4 [&_hr]:border-border [&_hr]:border-t [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_li]:mb-1 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_u]:underline [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4"

type PracticeQuestionMarkdownProps = {
  content: string
  className?: string
  /**
   * Embed YouTube/Loom links as players; try common image URLs and markdown images with onError fallback.
   * Use for video course lesson bodies — keep off for practice questions.
   */
  richMedia?: boolean
}

export function PracticeQuestionMarkdown({
  content,
  className,
  richMedia = false,
}: PracticeQuestionMarkdownProps) {
  const normalizedContent = normalizePracticeQuestionText(content)

  if (!normalizedContent.trim()) {
    return null
  }

  return (
    <div className={cn(QUESTION_MARKDOWN_CLASSNAME, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        remarkRehypeOptions={{ allowDangerousHtml: true }}
        components={richMedia ? richMediaMarkdownComponents : undefined}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}
