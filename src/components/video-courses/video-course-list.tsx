"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, GripVertical, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoCourseCatalogCard } from "@/components/video-courses/video-course-catalog-card"
import { VideoCourseDetailsDialog } from "@/components/video-courses/video-course-details-dialog"
import { useAuth } from "@/lib/auth-context"
import type { VideoCourse, VideoCourseOwnerRole, VideoCourseVisibility } from "@/lib/types"
import {
  createVideoCourse,
  createVideoCourseLesson,
  createVideoCourseModule,
  getVideoCourseOwnerDisplayLabel,
  getVideoCourseProgress,
  listVideoCourseLessons,
  listVideoCoursesForAdmin,
  listVideoCoursesForCoach,
  updateVideoCourse,
  VIDEO_COURSE_PLATFORM_CREATOR_LABEL,
} from "@/lib/video-course-queries"

type ListMode = "admin" | "coach"

type VideoCourseListProps = {
  mode: ListMode
  editorBasePath: string
}

type CourseRow = {
  course: VideoCourse
  lessonCount: number
  completedCount: number
  firstLessonId: string | null
  /** Admin: resolved creator name for search + card */
  ownerDisplayLabel?: string
}

export function VideoCourseList({ mode, editorBasePath }: VideoCourseListProps) {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const [rows, setRows] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState("")
  const [detailsCourseId, setDetailsCourseId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null)
  const [courseDropTarget, setCourseDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null)

  const listHref = mode === "admin" ? "/admin/video-courses" : "/coach/video-courses"

  const load = useCallback(async () => {
    let list: VideoCourse[] = []
    if (mode === "admin" && isAdmin) {
      list = await listVideoCoursesForAdmin()
    } else if (mode === "coach" && user?.uid) {
      list = await listVideoCoursesForCoach()
    }

    const ownerIds =
      mode === "admin"
        ? [...new Set(list.filter((c) => c.ownerRole === "coach").map((c) => c.ownerId).filter(Boolean))]
        : []
    const ownerLabelById = new Map<string, string>()
    if (mode === "admin") {
      await Promise.all(
        ownerIds.map(async (id) => {
          ownerLabelById.set(id, await getVideoCourseOwnerDisplayLabel(id))
        })
      )
    }

    const enriched = await Promise.all(
      list.map(async (course) => {
        const lessons = await listVideoCourseLessons(course.id)
        const sorted = [...lessons].sort((a, b) => a.order - b.order)
        const lessonIdSet = new Set(lessons.map((l) => l.id))
        let completedCount = 0
        if (user?.uid && lessons.length > 0) {
          const prog = await getVideoCourseProgress(user.uid, course.id)
          completedCount = (prog?.completedLessonIds ?? []).filter((id) => lessonIdSet.has(id)).length
        }
        return {
          course,
          lessonCount: lessons.length,
          completedCount,
          firstLessonId: sorted[0]?.id ?? null,
          ownerDisplayLabel:
            mode === "admin"
              ? course.ownerRole === "admin"
                ? VIDEO_COURSE_PLATFORM_CREATOR_LABEL
                : (ownerLabelById.get(course.ownerId) ?? "Coach")
              : undefined,
        }
      })
    )
    setRows(enriched)
  }, [mode, isAdmin, user?.uid])

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(({ course, ownerDisplayLabel }) => {
      const hay = [course.title, course.description, ownerDisplayLabel ?? ""]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  // 表示順の入れ替え。隣接コースと位置を交換し、全体を 1..N で振り直して永続化する。
  // （移行データには order の同値が存在するため、値交換ではなく index 基準で連番を振り直す）
  // 検索中は並びが崩れるため無効化する（filtered と rows の並びが一致する前提）。
  const moveCourse = async (courseId: string, direction: "up" | "down") => {
    if (reordering) return
    const ordered = [...rows].sort((a, b) => a.course.order - b.course.order)
    const idx = ordered.findIndex((r) => r.course.id === courseId)
    if (idx < 0) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= ordered.length) return

    // 対象と隣を入れ替えた新しい並び
    const next = [...ordered]
    ;[next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!]

    // 新しい連番（1 始まり）。order が変わるものだけ Firestore を更新。
    const updates: { id: string; order: number }[] = []
    next.forEach((r, i) => {
      const newOrder = i + 1
      if (r.course.order !== newOrder) updates.push({ id: r.course.id, order: newOrder })
    })
    if (updates.length === 0) return

    setReordering(true)
    try {
      await Promise.all(updates.map((u) => updateVideoCourse(u.id, { order: u.order })))
      // 楽観的更新（再読込を待たずに並びを反映）
      const newOrderById = new Map(next.map((r, i) => [r.course.id, i + 1]))
      setRows((prev) =>
        [...prev]
          .map((r) => ({
            ...r,
            course: { ...r.course, order: newOrderById.get(r.course.id) ?? r.course.order },
          }))
          .sort((x, y) => x.course.order - y.course.order)
      )
    } finally {
      setReordering(false)
    }
  }

  const dropCourse = async (targetId: string, position: "before" | "after") => {
    if (!draggedCourseId || draggedCourseId === targetId || reordering) return
    const ordered = [...rows].sort((a, b) => a.course.order - b.course.order)
    const from = ordered.findIndex((row) => row.course.id === draggedCourseId)
    if (from < 0 || !ordered.some((row) => row.course.id === targetId)) return
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    const targetIndex = next.findIndex((row) => row.course.id === targetId)
    next.splice(targetIndex + (position === "after" ? 1 : 0), 0, moved)
    setReordering(true)
    setRows(next.map((row, index) => ({ ...row, course: { ...row.course, order: index + 1 } })))
    try {
      await Promise.all(next.map((row, index) => updateVideoCourse(row.course.id, { order: index + 1 })))
    } finally {
      setReordering(false)
      setDraggedCourseId(null)
      setCourseDropTarget(null)
    }
  }

  const handleNew = async () => {
    if (!user?.uid) return
    setCreating(true)
    try {
      const maxOrder = Math.max(0, ...rows.map((r) => r.course.order))
      let ownerRole: VideoCourseOwnerRole = "coach"
      let visibility: VideoCourseVisibility = "coach_clients"
      if (mode === "admin" && isAdmin) {
        ownerRole = "admin"
        visibility = "all_students"
      }
      const id = await createVideoCourse({
        title: "Untitled course",
        description: "",
        thumbnailUrl: "",
        ownerId: user.uid,
        ownerRole,
        visibility,
        published: false,
        order: maxOrder + 1,
      })
      const moduleId = await createVideoCourseModule({
        courseId: id,
        title: "New module",
        order: 1,
      })
      const lessonId = await createVideoCourseLesson({
        courseId: id,
        moduleId,
        title: "New lesson",
        order: 1,
        contentType: "video",
        body: "",
      })
      router.push(`${editorBasePath}/${id}/lessons/${lessonId}`)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <>
      <VideoCourseDetailsDialog
        open={detailsCourseId != null}
        onOpenChange={(o) => {
          if (!o) setDetailsCourseId(null)
        }}
        courseId={detailsCourseId}
        mode={mode}
        listHref={listHref}
        onSaved={() => void load()}
      />
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">Explore courses</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              aria-label="Search courses"
            />
          </div>
          <Button
            className="shrink-0"
            onClick={() => void handleNew()}
            disabled={creating || !user?.uid}
          >
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creating…" : "Add course"}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>Start by creating a new course.</CardDescription>
          </CardHeader>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No courses match your search.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ course: c, lessonCount, completedCount, firstLessonId, ownerDisplayLabel }, i) => {
            const previewHref = firstLessonId
              ? `${editorBasePath}/${c.id}/lessons/${firstLessonId}`
              : `${editorBasePath}/${c.id}`
            const isSearching = query.trim().length > 0
            const canReorder = mode === "admin" && !isSearching
            return (
              <div
                key={c.id}
                draggable={canReorder && !reordering}
                onDragStart={(event) => { setDraggedCourseId(c.id); event.dataTransfer.effectAllowed = "move" }}
                onDragOver={(event) => { if (canReorder) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setCourseDropTarget({ id: c.id, position: event.clientY < rect.top + rect.height / 2 ? "before" : "after" }) } }}
                onDrop={(event) => { event.preventDefault(); if (courseDropTarget) void dropCourse(c.id, courseDropTarget.position) }}
                onDragEnd={() => { setDraggedCourseId(null); setCourseDropTarget(null) }}
                className={`relative rounded-xl transition ${draggedCourseId === c.id ? "opacity-50" : ""}`}
              >
              {courseDropTarget?.id === c.id && draggedCourseId !== c.id && <div className={`pointer-events-none absolute z-30 h-1 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--background))] ${courseDropTarget.position === "before" ? "-top-2" : "-bottom-2"} left-1 right-1`} />}
              {canReorder && <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-md border bg-background/90 p-1.5 text-muted-foreground shadow-sm"><GripVertical className="h-4 w-4" /></div>}
              <VideoCourseCatalogCard
                key={c.id}
                course={c}
                mainHref={previewHref}
                lessonCount={lessonCount}
                completedCount={lessonCount > 0 ? completedCount : undefined}
                totalLessons={lessonCount > 0 ? lessonCount : undefined}
                creatorLabel={mode === "admin" ? ownerDisplayLabel : undefined}
                footer={
                  <div className="flex items-center gap-2">
                    {canReorder ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={reordering || i === 0}
                          onClick={() => void moveCourse(c.id, "up")}
                          title="上へ移動"
                          aria-label={`${c.title} を上へ移動`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={reordering || i === filtered.length - 1}
                          onClick={() => void moveCourse(c.id, "down")}
                          title="下へ移動"
                          aria-label={`${c.title} を下へ移動`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-w-0 flex-1"
                      onClick={() => setDetailsCourseId(c.id)}
                    >
                      コース設定
                    </Button>
                  </div>
                }
              />
              </div>
            )
          })}
        </div>
      )}
    </div>
    </>
  )
}
