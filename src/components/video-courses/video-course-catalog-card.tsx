"use client"

import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"
import { Progress } from "@/components/ui/progress"
import type { VideoCourse } from "@/lib/types"
import { cn } from "@/lib/utils"

type VideoCourseCatalogCardProps = {
  course: VideoCourse
  /** Main navigation target (thumbnail + title) */
  mainHref: string
  lessonCount?: number
  completedCount?: number
  totalLessons?: number
  /** Extra row under progress (e.g. Edit / Preview buttons for staff) */
  footer?: ReactNode
  /** Creator shown on the card: "ENGLISH GYM" for admin-made courses, or the coach’s name */
  creatorLabel?: string
  /** Student list: who the course is for */
  courseAudienceLabel?: string
  className?: string
}

export function VideoCourseCatalogCard({
  course,
  mainHref,
  lessonCount,
  completedCount,
  totalLessons,
  footer,
  creatorLabel,
  courseAudienceLabel,
  className,
}: VideoCourseCatalogCardProps) {
  const showProgress =
    typeof completedCount === "number" &&
    typeof totalLessons === "number" &&
    totalLessons > 0
  const pct = showProgress ? Math.round((completedCount / totalLessons) * 100) : 0

  return (
    <article
      className={cn(
        "group/card flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm",
        "transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
        className
      )}
    >
      <Link href={mainHref} className="block shrink-0 outline-none">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 ease-out will-change-transform group-hover/card:scale-[1.06]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground transition-transform duration-300 ease-out group-hover/card:scale-[1.02]">
              No thumbnail
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <Link href={mainHref} className="group/title block outline-none">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-card-foreground transition-colors group-hover/title:text-primary">
            {course.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {course.description?.trim() ? course.description : "Open the course to start learning."}
        </p>
        {creatorLabel ? (
          <p className="text-xs text-muted-foreground/90" title={creatorLabel}>
            {creatorLabel}
          </p>
        ) : null}
        {courseAudienceLabel ? (
          <p className="text-xs font-medium text-primary/90">{courseAudienceLabel}</p>
        ) : null}
        {typeof lessonCount === "number" && (
          <p className="text-xs text-muted-foreground">
            {lessonCount === 1 ? "1 lesson" : `${lessonCount} lessons`}
          </p>
        )}
        {showProgress ? (
          <div className="mt-auto space-y-1.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Progress</span>
              <span className="text-sm font-semibold tabular-nums text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalLessons} lessons completed
            </p>
            {footer ? <div className="pt-1">{footer}</div> : null}
          </div>
        ) : (
          <>
            {footer ? (
              <div className={cn(typeof lessonCount === "number" ? "mt-auto pt-2" : "mt-2")}>{footer}</div>
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}
