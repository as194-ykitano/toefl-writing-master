"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronLeft, ChevronRight, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PracticeQuestionMarkdown } from "@/components/practice/practice-question-markdown"
import { LessonVideoEmbed } from "@/components/video-courses/lesson-video-embed"
import { VideoCourseStructureEditor } from "@/components/video-courses/video-course-structure-editor"
import { useAuth } from "@/lib/auth-context"
import type { VideoCourseLesson, VideoCourseModule } from "@/lib/types"
import {
  fetchVideoCourseWithStructure,
  flattenLessonOrder,
  getVideoCourseLesson,
  getVideoCourseProgress,
  markVideoCourseLessonsComplete,
  staffCanPreviewVideoCourse,
  studentCanViewPublishedCourse,
} from "@/lib/video-course-queries"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export type CourseLessonViewRole = "student" | "staff"

export type CourseLessonViewProps = {
  courseId: string
  lessonId: string
  coursesIndexHref: string
  /** Base path without trailing slash, e.g. /student/video-courses */
  lessonPathPrefix: string
  role: CourseLessonViewRole
  /** Opens course details (title, thumbnail, publish, …) for staff */
  onStaffOpenCourseDetails?: () => void
}

type ModuleGroup = {
  module: VideoCourseModule
  lessons: VideoCourseLesson[]
}

function lessonShareUrl(lessonPathPrefix: string, courseId: string, lessonId: string): string {
  const path = `${lessonPathPrefix}/${courseId}/lessons/${lessonId}`
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path}`
}

export function CourseLessonView({
  courseId,
  lessonId,
  coursesIndexHref,
  lessonPathPrefix,
  role,
  onStaffOpenCourseDetails,
}: CourseLessonViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isAdmin, studentData } = useAuth()
  const coachUid = studentData?.coach

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [courseTitle, setCourseTitle] = useState("")
  const [modules, setModules] = useState<ModuleGroup[]>([])
  const [orderedLessons, setOrderedLessons] = useState<VideoCourseLesson[]>([])
  const [lesson, setLesson] = useState<VideoCourseLesson | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [totalLessons, setTotalLessons] = useState(0)
  const [courseOwnerId, setCourseOwnerId] = useState<string | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)

  const enableProgress = role === "student" && !!user?.uid

  const isAdminLessonRoute = lessonPathPrefix.startsWith("/admin/")
  const canManageStructure =
    role === "staff" &&
    !!user?.uid &&
    ((isAdminLessonRoute && !!isAdmin) || (!isAdminLessonRoute && courseOwnerId === user.uid))

  const load = useCallback(async () => {
    if (!courseId || !lessonId) {
      setAllowed(false)
      setLesson(null)
      setCourseOwnerId(null)
      return
    }
    const structure = await fetchVideoCourseWithStructure(courseId)
    if (!structure) {
      setAllowed(false)
      setCourseOwnerId(null)
      return
    }

    const okStudent =
      role === "student" && studentCanViewPublishedCourse(structure.course, coachUid)
    const okStaff =
      role === "staff" &&
      staffCanPreviewVideoCourse(structure.course, user?.uid, isAdmin) &&
      !!user?.uid

    if (!okStudent && !okStaff) {
      setAllowed(false)
      setCourseOwnerId(null)
      return
    }

    setAllowed(true)
    setCourseTitle(structure.course.title)
    setCourseOwnerId(structure.course.ownerId)

    const mods = [...structure.modules].sort((a, b) => a.order - b.order)
    const groups: ModuleGroup[] = mods.map((m) => ({
      module: m,
      lessons: structure.lessons
        .filter((l) => l.moduleId === m.id)
        .sort((a, b) => a.order - b.order),
    }))
    setModules(groups)
    const flat = flattenLessonOrder(structure.modules, structure.lessons)
    setOrderedLessons(flat)
    setTotalLessons(flat.length)

    if (user?.uid && (enableProgress || role === "staff")) {
      const prog = await getVideoCourseProgress(user.uid, courseId)
      const lessonIdSet = new Set(flat.map((l) => l.id))
      const done = new Set(
        (prog?.completedLessonIds ?? []).filter((id) => lessonIdSet.has(id))
      )
      setCompletedIds(done)
    } else {
      setCompletedIds(new Set())
    }

    const l = await getVideoCourseLesson(lessonId)
    if (!l || l.courseId !== courseId) {
      setLesson(null)
      return
    }
    setLesson(l)
  }, [courseId, lessonId, coachUid, role, user?.uid, isAdmin, enableProgress])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await load()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  const idx = useMemo(() => orderedLessons.findIndex((l) => l.id === lessonId), [orderedLessons, lessonId])
  const prevId = idx > 0 ? orderedLessons[idx - 1]?.id ?? null : null
  const nextId =
    idx >= 0 && idx < orderedLessons.length - 1 ? orderedLessons[idx + 1]?.id ?? null : null

  const completedCount = completedIds.size
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const lessonHref = (id: string) => `${lessonPathPrefix}/${courseId}/lessons/${id}`

  const copyLessonShareLink = (id: string) => {
    const url = lessonShareUrl(lessonPathPrefix, courseId, id)
    void navigator.clipboard.writeText(url).then(
      () => {
        toast({ title: "Link copied", description: "Paste it in chat or social posts." })
      },
      () => {
        toast({ title: "Could not copy", description: "Copy the URL from the address bar.", variant: "destructive" })
      }
    )
  }

  const markCurrentLessonComplete = async () => {
    if (!lesson || !enableProgress || !user?.uid) return
    if (completedIds.has(lesson.id)) return
    setMarkingComplete(true)
    try {
      await markVideoCourseLessonsComplete(user.uid, courseId, [lesson.id])
      setCompletedIds((prev) => new Set(prev).add(lesson.id))
    } finally {
      setMarkingComplete(false)
    }
  }

  const goNext = async () => {
    if (!lesson) return
    if (enableProgress && user?.uid && !completedIds.has(lesson.id)) {
      await markVideoCourseLessonsComplete(user.uid, courseId, [lesson.id])
      setCompletedIds((prev) => new Set(prev).add(lesson.id))
    }
    if (nextId) {
      router.push(lessonHref(nextId))
    } else {
      router.push(coursesIndexHref)
    }
  }

  const goPrev = () => {
    if (prevId) router.push(lessonHref(prevId))
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p className="text-sm text-muted-foreground">This course is not available.</p>
        <Button variant="outline" asChild>
          <Link href={coursesIndexHref}>Back to courses</Link>
        </Button>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p className="text-sm text-muted-foreground">This lesson could not be loaded.</p>
        <Button variant="outline" asChild>
          <Link href={coursesIndexHref}>Back to courses</Link>
        </Button>
      </div>
    )
  }

  const currentModuleTitle =
    modules.find((g) => g.lessons.some((l) => l.id === lessonId))?.module.title ?? ""

  const showVideoCompleteButton =
    enableProgress &&
    (lesson.contentType === "video" || !!lesson.embeddedVideo?.url?.trim())

  return (
    <div className="flex flex-col gap-6 pb-24 lg:flex-row lg:items-start lg:gap-0 lg:pb-8">
      <main className="min-w-0 flex-1 space-y-5 px-4 pt-2 sm:px-6 lg:max-w-none lg:flex-1 lg:px-8 lg:pr-6">
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link href={coursesIndexHref} className="font-medium hover:text-foreground">
            Courses
          </Link>
          <span className="text-border">/</span>
          <span className="max-w-[10rem] truncate sm:max-w-xs" title={courseTitle}>
            {courseTitle}
          </span>
          {currentModuleTitle ? (
            <>
              <span className="text-border">/</span>
              <span className="max-w-[8rem] truncate text-foreground/80 sm:max-w-[14rem]" title={currentModuleTitle}>
                {currentModuleTitle}
              </span>
            </>
          ) : null}
        </nav>

        {(lesson.contentType === "video" || lesson.embeddedVideo?.url?.trim()) && (
          <LessonVideoEmbed embeddedVideo={lesson.embeddedVideo} title={lesson.title} />
        )}

        <div className="flex flex-wrap items-start justify-between gap-3 gap-y-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {lesson.title}
            </h1>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Copy link to this lesson"
              aria-label="Copy link to this lesson"
              onClick={() => copyLessonShareLink(lesson.id)}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
          {showVideoCompleteButton ? (
            completedIds.has(lesson.id) ? (
              <p className="flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
                <Check className="h-4 w-4 shrink-0" aria-hidden />
                完了済み
              </p>
            ) : (
              <Button
                type="button"
                className="shrink-0"
                disabled={markingComplete}
                onClick={() => void markCurrentLessonComplete()}
              >
                {markingComplete ? "保存中…" : "完了にする"}
              </Button>
            )
          ) : null}
        </div>

        {lesson.body?.trim() ? (
          <section className="rounded-xl border border-border/60 bg-card/40 px-4 py-4 sm:px-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overview</h2>
              {canManageStructure ? (
                <p className="text-[11px] text-muted-foreground">Edit via sidebar (row pencil or Add lesson)</p>
              ) : null}
            </div>
            <div className="prose-wrap text-sm">
              <PracticeQuestionMarkdown content={lesson.body} richMedia />
            </div>
          </section>
        ) : role === "staff" && canManageStructure ? (
          <p className="text-sm text-muted-foreground">
            No description for this lesson. Open the lesson from the sidebar (pencil on hover) or use Add lesson to edit.
          </p>
        ) : null}

        <div className="hidden items-center justify-between gap-4 border-t border-border pt-6 lg:flex">
          <Button type="button" variant="outline" disabled={!prevId} onClick={goPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button type="button" className="min-w-[9rem]" onClick={() => void goNext()}>
            {nextId ? (
              <>
                Next lesson
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            ) : (
              "Back to courses"
            )}
          </Button>
        </div>
      </main>

      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-t border-border bg-card/50 px-4 py-4 sm:px-6",
          "lg:sticky lg:top-0 lg:h-[calc(100dvh)] lg:max-h-[calc(100dvh)] lg:min-h-0 lg:w-[min(100%,20rem)] lg:overflow-hidden lg:border-l lg:border-t-0 lg:px-5 lg:py-6 xl:w-96"
        )}
      >
        {totalLessons > 0 && user?.uid && (enableProgress || role === "staff") ? (
          <div className="mb-5 shrink-0 rounded-xl border border-border bg-background/80 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">Progress</span>
              <span className="text-sm font-semibold tabular-nums text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="mb-2 h-1.5" />
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalLessons} lessons completed
            </p>
          </div>
        ) : totalLessons > 0 && role === "staff" && !user?.uid ? (
          <div className="mb-5 shrink-0 rounded-xl border border-border bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">
              {totalLessons === 1 ? "1 lesson" : `${totalLessons} lessons`} in this course
            </p>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {canManageStructure ? (
            <VideoCourseStructureEditor
              courseId={courseId}
              canEdit
              lessonPathPrefix={lessonPathPrefix}
              activeLessonId={lessonId}
              completedLessonIds={completedIds}
              defaultModuleIdForNewLesson={lesson.moduleId}
              onCourseSettingsClick={onStaffOpenCourseDetails}
              onStructureChanged={() => void load()}
            />
          ) : (
            <>
              <h2 className="mb-3 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lessons
              </h2>
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain max-h-[min(65vh,26rem)] lg:max-h-none">
                <div className="space-y-5 pr-0.5">
                  {modules.map((group) => (
                    <div key={group.module.id}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
                        {group.module.title}
                      </p>
                      <ul className="space-y-1">
                        {group.lessons.map((l) => {
                          const active = l.id === lessonId
                          const done = completedIds.has(l.id)
                          return (
                            <li key={l.id}>
                              <div
                                className={cn(
                                  "flex items-stretch gap-0.5 rounded-lg border text-sm transition-colors",
                                  active
                                    ? "border-primary bg-primary/10 font-medium text-foreground shadow-sm"
                                    : "border-transparent hover:bg-muted/70"
                                )}
                              >
                                <Link
                                  href={lessonHref(l.id)}
                                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2"
                                >
                                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                                  {done ? (
                                    <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Completed" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  )}
                                </Link>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-auto w-9 shrink-0 rounded-l-none rounded-r-lg"
                                  title="Copy lesson link"
                                  aria-label={`Copy link for ${l.title}`}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    copyLessonShareLink(l.id)
                                  }}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" disabled={!prevId} onClick={goPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>
          <Button type="button" size="sm" className="flex-1" onClick={() => void goNext()}>
            {nextId ? "Next lesson" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  )
}
