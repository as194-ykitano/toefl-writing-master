"use client"

import type { PracticeItemEmbeddedVideo } from "@/lib/types"
import { resolveLessonVideoEmbedSrc } from "@/lib/video-embed"

type LessonVideoEmbedProps = {
  embeddedVideo: PracticeItemEmbeddedVideo | undefined
  title: string
}

export function LessonVideoEmbed({ embeddedVideo, title }: LessonVideoEmbedProps) {
  if (!embeddedVideo?.url?.trim()) return null
  const src = resolveLessonVideoEmbedSrc(embeddedVideo)
  if (!src) return null
  return (
    <iframe
      title={title}
      src={src}
      className="aspect-video w-full overflow-hidden rounded-xl"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}
