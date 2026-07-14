"use client"

import { useState } from "react"
import type { Components } from "react-markdown"
import { getYoutubeLoomEmbedSrc } from "@/lib/video-embed"
import { shouldAttemptImageEmbed } from "@/lib/markdown-image-url"
import { cn } from "@/lib/utils"

function isSafeHttpUrl(href: string | undefined): boolean {
  if (!href?.trim()) return false
  try {
    const u = new URL(href.trim())
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function RichMarkdownImage({
  src,
  alt,
  className,
}: {
  src: string
  alt?: string
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  if (!isSafeHttpUrl(src)) {
    return <span className="text-xs text-muted-foreground">Invalid image URL</span>
  }
  if (broken) {
    return (
      <span className="my-3 block rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-xs text-muted-foreground">Could not load image.</span>{" "}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary underline"
        >
          {src}
        </a>
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary lesson URLs (Firebase, etc.)
    <img
      src={src}
      alt={alt ?? ""}
      className={cn("my-3 h-auto max-w-full rounded-md border border-border", className)}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  )
}

export const richMediaMarkdownComponents: Partial<Components> = {
  a: ({ href, children, ...rest }) => {
    if (!href || !isSafeHttpUrl(href)) {
      return (
        <a href={href} {...rest}>
          {children}
        </a>
      )
    }
    const embed = getYoutubeLoomEmbedSrc(href)
    if (embed) {
      return (
        <span className="my-4 block w-full max-w-full space-y-2">
          <span className="relative block aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
            <iframe
              title="Embedded video"
              src={embed}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </span>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-xs text-primary underline"
          >
            {children}
          </a>
        </span>
      )
    }
    if (shouldAttemptImageEmbed(href)) {
      const altText = typeof children === "string" ? children : "Linked image"
      return <RichMarkdownImage src={href} alt={altText} />
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  },
  img: ({ src, alt }) => {
    if (typeof src !== "string" || !isSafeHttpUrl(src)) return null
    return <RichMarkdownImage src={src} alt={alt ?? undefined} />
  },
}
