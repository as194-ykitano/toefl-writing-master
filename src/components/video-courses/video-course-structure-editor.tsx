"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronRight, GripVertical, Layers, Link2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PracticeItemEmbeddedVideo, VideoCourseLesson } from "@/lib/types"
import {
  createVideoCourseLesson,
  createVideoCourseModule,
  deleteVideoCourseLesson,
  deleteVideoCourseModule,
  fetchVideoCourseWithStructure,
  flattenLessonOrder,
  updateVideoCourseLesson,
  updateVideoCourseModule,
} from "@/lib/video-course-queries"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

function buildLessonPublicUrl(lessonPathPrefix: string, courseId: string, lessonId: string): string {
  const path = `${lessonPathPrefix}/${courseId}/lessons/${lessonId}`
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path}`
}

const emptyLessonForm = {
  title: "",
  order: 0,
  contentType: "video" as VideoCourseLesson["contentType"],
  body: "",
  provider: "youtube" as PracticeItemEmbeddedVideo["provider"],
  url: "",
}

export type VideoCourseStructureEditorProps = {
  courseId: string
  canEdit: boolean
  lessonPathPrefix: string
  /** Highlighted lesson row (preview page) */
  activeLessonId?: string
  /** After mutations; parent can refetch lesson content / order */
  onStructureChanged?: () => void | Promise<void>
  /** Sidebar: completion checkmarks / numbering */
  completedLessonIds?: ReadonlySet<string>
  /** Sidebar “Add lesson”: default module (usually current lesson’s module) */
  defaultModuleIdForNewLesson?: string | null
  /** Open course details (title, thumbnail, …) */
  onCourseSettingsClick?: () => void
}

export function VideoCourseStructureEditor({
  courseId,
  canEdit,
  lessonPathPrefix,
  activeLessonId,
  onStructureChanged,
  completedLessonIds,
  defaultModuleIdForNewLesson,
  onCourseSettingsClick,
}: VideoCourseStructureEditorProps) {
  const router = useRouter()
  const { toast } = useToast()
  const onStructureChangedRef = useRef(onStructureChanged)
  onStructureChangedRef.current = onStructureChanged

  const [loading, setLoading] = useState(true)
  const [structure, setStructure] = useState<Awaited<ReturnType<typeof fetchVideoCourseWithStructure>>>(null)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState(emptyLessonForm)
  const [manageModulesOpen, setManageModulesOpen] = useState(false)
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null)
  const [lessonDropTarget, setLessonDropTarget] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const doneIds = completedLessonIds ?? new Set<string>()

  const refresh = useCallback(async () => {
    const data = await fetchVideoCourseWithStructure(courseId)
    setStructure(data)
    await onStructureChangedRef.current?.()
  }, [courseId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await refresh()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const addModule = async () => {
    if (!canEdit) return
    const maxOrder = Math.max(0, ...(structure?.modules.map((m) => m.order) ?? []))
    await createVideoCourseModule({ courseId, title: "New module", order: maxOrder + 1 })
    await refresh()
  }

  const saveModule = async (moduleId: string, t: string, o: number) => {
    if (!canEdit) return
    await updateVideoCourseModule(moduleId, { title: t.trim(), order: o })
    await refresh()
  }

  const removeModule = async (moduleId: string) => {
    if (!canEdit) return
    await deleteVideoCourseModule(moduleId, courseId)
    await refresh()
  }

  const openNewLesson = (moduleId: string) => {
    setEditingLessonId(null)
    setLessonModuleId(moduleId)
    const lessonsInMod = structure?.lessons.filter((l) => l.moduleId === moduleId) ?? []
    const maxOrder = Math.max(0, ...lessonsInMod.map((l) => l.order))
    setLessonForm({ ...emptyLessonForm, order: maxOrder + 1 })
    setLessonDialogOpen(true)
  }

  const openEditLesson = (lesson: VideoCourseLesson) => {
    setEditingLessonId(lesson.id)
    setLessonModuleId(lesson.moduleId)
    setLessonForm({
      title: lesson.title,
      order: lesson.order,
      contentType: lesson.contentType,
      body: lesson.body,
      provider: lesson.embeddedVideo?.provider ?? "youtube",
      url: lesson.embeddedVideo?.url ?? "",
    })
    setLessonDialogOpen(true)
  }

  const saveLesson = async () => {
    if (!canEdit || !lessonModuleId) return
    const ev: PracticeItemEmbeddedVideo | undefined =
      lessonForm.contentType === "video" && lessonForm.url.trim()
        ? { provider: lessonForm.provider, url: lessonForm.url.trim() }
        : undefined
    if (editingLessonId) {
      await updateVideoCourseLesson(editingLessonId, {
        title: lessonForm.title,
        order: lessonForm.order,
        contentType: lessonForm.contentType,
        body: lessonForm.body,
        embeddedVideo: lessonForm.contentType === "video" ? ev ?? null : null,
        moduleId: lessonModuleId,
      })
      setLessonDialogOpen(false)
      await refresh()
    } else {
      const newId = await createVideoCourseLesson({
        courseId,
        moduleId: lessonModuleId,
        title: lessonForm.title,
        order: lessonForm.order,
        contentType: lessonForm.contentType,
        body: lessonForm.body,
        embeddedVideo: ev,
      })
      setLessonDialogOpen(false)
      await refresh()
      router.push(`${lessonPathPrefix}/${courseId}/lessons/${newId}`)
    }
  }

  const removeLesson = async (lessonId: string) => {
    if (!canEdit) return
    await deleteVideoCourseLesson(lessonId)
    await refresh()
  }

  const dropLesson = async (targetModuleId: string, targetLessonId?: string, position: "before" | "after" = "after") => {
    if (!canEdit || !structure || !draggedLessonId || savingOrder) return
    const dragged = structure.lessons.find((lesson) => lesson.id === draggedLessonId)
    if (!dragged || dragged.id === targetLessonId) return
    const grouped = new Map<string, VideoCourseLesson[]>()
    for (const module of structure.modules) {
      grouped.set(module.id, structure.lessons.filter((lesson) => lesson.moduleId === module.id && lesson.id !== dragged.id).sort((a, b) => a.order - b.order))
    }
    const target = grouped.get(targetModuleId) ?? []
    const targetIndex = targetLessonId ? target.findIndex((lesson) => lesson.id === targetLessonId) : target.length
    const insertAt = targetIndex < 0 ? target.length : targetIndex + (position === "after" ? 1 : 0)
    target.splice(insertAt, 0, { ...dragged, moduleId: targetModuleId })
    grouped.set(targetModuleId, target)
    const nextLessons = structure.modules.flatMap((module) =>
      (grouped.get(module.id) ?? []).map((lesson, index) => ({ ...lesson, moduleId: module.id, order: index + 1 }))
    )
    setStructure({ ...structure, lessons: nextLessons })
    setSavingOrder(true)
    try {
      await Promise.all(nextLessons.map((lesson) => updateVideoCourseLesson(lesson.id, { moduleId: lesson.moduleId, order: lesson.order })))
      await onStructureChangedRef.current?.()
    } finally {
      setSavingOrder(false)
      setDraggedLessonId(null)
      setLessonDropTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center py-6 text-sm text-muted-foreground">
        Loading structure…
      </div>
    )
  }

  if (!structure) {
    return (
      <p className="flex-1 py-3 text-sm text-muted-foreground">Could not load course structure.</p>
    )
  }

  const modulesSorted = [...structure.modules].sort((a, b) => a.order - b.order)

  const handleAddLessonClick = () => {
    if (modulesSorted.length === 0) return
    const preferred =
      defaultModuleIdForNewLesson &&
      modulesSorted.some((m) => m.id === defaultModuleIdForNewLesson)
        ? defaultModuleIdForNewLesson
        : modulesSorted[0]!.id
    openNewLesson(preferred)
  }

  const flatOrdered = flattenLessonOrder(structure.modules, structure.lessons)
  const lessonNumberById = new Map<string, number>()
  flatOrdered.forEach((l, i) => lessonNumberById.set(l.id, i + 1))

  const lessonDialogEl = (
    <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingLessonId ? "Edit lesson" : "New lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={lessonForm.title}
              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          {modulesSorted.length > 1 ? (
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={lessonModuleId ?? ""}
                onValueChange={(v) => setLessonModuleId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose module" />
                </SelectTrigger>
                <SelectContent>
                  {modulesSorted.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Order</Label>
            <Input
              type="number"
              value={lessonForm.order}
              onChange={(e) =>
                setLessonForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Content type</Label>
            <Select
              value={lessonForm.contentType}
              onValueChange={(v) =>
                setLessonForm((f) => ({ ...f, contentType: v as VideoCourseLesson["contentType"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video + text</SelectItem>
                <SelectItem value="text">Text only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {lessonForm.contentType === "video" && (
            <>
              <div className="space-y-2">
                <Label>Video provider</Label>
                <p className="text-xs text-muted-foreground">
                  The embed is chosen from the URL when possible; this label is mainly for your records.
                </p>
                <Select
                  value={lessonForm.provider}
                  onValueChange={(v) =>
                    setLessonForm((f) => ({
                      ...f,
                      provider: v as PracticeItemEmbeddedVideo["provider"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="loom">Loom</SelectItem>
                    <SelectItem value="riverside">Riverside</SelectItem>
                    <SelectItem value="spotify">Spotify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  placeholder="YouTube, Loom, Riverside, or Spotify link"
                  value={lessonForm.url}
                  onChange={(e) => setLessonForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>{lessonForm.contentType === "video" ? "Description (markdown)" : "Content (markdown)"}</Label>
            <Textarea
              rows={6}
              value={lessonForm.body}
              onChange={(e) => setLessonForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setLessonDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void saveLesson()}>
            Save lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-5">
        {canEdit ? (
          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setManageModulesOpen(true)}>
              <Layers className="mr-2 h-4 w-4 shrink-0" />
              Manage modules
            </Button>
            <Button
              type="button"
              variant="default"
              className="w-full font-semibold shadow-sm"
              disabled={modulesSorted.length === 0}
              onClick={handleAddLessonClick}
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              Add lesson
            </Button>
          </div>
        ) : null}

        {onCourseSettingsClick ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground"
            onClick={onCourseSettingsClick}
          >
            Course settings
          </Button>
        ) : null}
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-foreground">Lessons</h2>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain max-h-[min(65vh,26rem)] pr-0.5 lg:max-h-none">
          {modulesSorted.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add a module (Manage modules) to create lessons.</p>
          ) : (
            <div className="space-y-4">
              {modulesSorted.map((mod, modIdx) => {
              const lessons = structure.lessons
                .filter((l) => l.moduleId === mod.id)
                .sort((a, b) => a.order - b.order)
              return (
                <div
                  key={mod.id}
                  className={`space-y-2 rounded-lg transition ${lessonDropTarget === `module:${mod.id}` ? "bg-primary/10 ring-2 ring-primary/40" : ""}`}
                  onDragOver={(event) => { if (canEdit && draggedLessonId) { event.preventDefault(); setLessonDropTarget(`module:${mod.id}`) } }}
                  onDrop={(event) => { event.preventDefault(); void dropLesson(mod.id) }}
                >
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Module {modIdx} — {mod.title}
                  </p>
                  <ul className="space-y-1.5">
                    {lessons.length === 0 ? (
                      <li className="text-xs text-muted-foreground">No lessons in this module.</li>
                    ) : (
                      lessons.map((l) => {
                        const active = l.id === activeLessonId
                        const n = lessonNumberById.get(l.id) ?? 0
                        const done = doneIds.has(l.id)
                        return (
                          <li
                            key={l.id}
                            draggable={canEdit && !savingOrder}
                            onDragStart={(event) => { setDraggedLessonId(l.id); event.dataTransfer.effectAllowed = "move" }}
                            onDragOver={(event) => { if (canEdit) { event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after"; setLessonDropTarget(`lesson:${l.id}:${position}`) } }}
                            onDrop={(event) => { event.preventDefault(); event.stopPropagation(); const position = lessonDropTarget?.endsWith(":before") ? "before" : "after"; void dropLesson(mod.id, l.id, position) }}
                            onDragEnd={() => { setDraggedLessonId(null); setLessonDropTarget(null) }}
                            className={`relative ${draggedLessonId === l.id ? "opacity-45" : ""}`}
                          >
                            {lessonDropTarget?.startsWith(`lesson:${l.id}:`) && draggedLessonId !== l.id && <div className={`pointer-events-none absolute z-20 h-0.5 rounded-full bg-primary ${lessonDropTarget.endsWith(":before") ? "-top-1" : "-bottom-1"} left-1 right-1`} />}
                            <div
                              className={cn(
                                "group flex items-stretch overflow-hidden rounded-xl border transition-colors",
                                active
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : "border-border/60 bg-muted/25 hover:bg-muted/40"
                              )}
                            >
                              <Link
                                href={`${lessonPathPrefix}/${courseId}/lessons/${l.id}`}
                                className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-2 pr-1 text-sm"
                              >
                                <span
                                  className="shrink-0 text-muted-foreground/35"
                                  title="Order lessons under Manage modules"
                                  aria-hidden
                                >
                                  <GripVertical className="h-4 w-4" />
                                </span>
                                <span
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                                    done
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background/80 text-muted-foreground"
                                  )}
                                >
                                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : n}
                                </span>
                                <span
                                  className={cn(
                                    "min-w-0 truncate font-semibold tracking-tight",
                                    active ? "text-foreground" : "text-foreground/90"
                                  )}
                                >
                                  {l.title}
                                </span>
                                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                              </Link>
                              {canEdit ? (
                                <div className="flex shrink-0 items-center border-l border-border/50 pr-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Copy lesson link"
                                    onClick={() => {
                                      const url = buildLessonPublicUrl(lessonPathPrefix, courseId, l.id)
                                      void navigator.clipboard.writeText(url).then(
                                        () =>
                                          toast({
                                            title: "Link copied",
                                            description: "Paste it in chat or social posts.",
                                          }),
                                        () =>
                                          toast({
                                            title: "Could not copy",
                                            variant: "destructive",
                                          })
                                      )
                                    }}
                                    aria-label={`Copy link for ${l.title}`}
                                  >
                                    <Link2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditLesson(l)}
                                    aria-label={`Edit ${l.title}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => void removeLesson(l.id)}
                                    aria-label={`Delete ${l.title}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>
              )
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={manageModulesOpen} onOpenChange={setManageModulesOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage modules</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto py-2 pr-1">
            {modulesSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No modules yet. Add one below.</p>
            ) : (
              modulesSorted.map((mod) => (
                <ManageModuleRow
                  key={mod.id}
                  mod={mod}
                  onSave={(t, o) => void saveModule(mod.id, t, o)}
                  onDelete={() => void removeModule(mod.id)}
                />
              ))
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" variant="secondary" className="w-full" onClick={() => void addModule()}>
              <Plus className="mr-2 h-4 w-4" />
              Add module
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setManageModulesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lessonDialogEl}
    </div>
  )
}

function ManageModuleRow({
  mod,
  onSave,
  onDelete,
}: {
  mod: { id: string; title: string; order: number }
  onSave: (title: string, order: number) => void
  onDelete: () => void
}) {
  const [t, setT] = useState(mod.title)
  const [o, setO] = useState(mod.order)
  useEffect(() => {
    setT(mod.title)
    setO(mod.order)
  }, [mod.title, mod.order])

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-xs">Module title</Label>
          <Input value={t} onChange={(e) => setT(e.target.value)} className="h-9" />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs">Order</Label>
          <Input
            type="number"
            value={o}
            onChange={(e) => setO(Number(e.target.value) || 0)}
            className="h-9"
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => onSave(t, o)}>
          Save
        </Button>
        <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={onDelete} aria-label="Delete module">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
