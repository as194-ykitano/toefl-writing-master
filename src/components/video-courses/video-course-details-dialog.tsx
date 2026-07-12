"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { VideoCourseVisibility } from "@/lib/types"
import {
  deleteVideoCourse,
  fetchVideoCourseWithStructure,
  updateVideoCourse,
} from "@/lib/video-course-queries"
import { CourseThumbnailField } from "./course-thumbnail-field"

export type VideoCourseDetailsMode = "admin" | "coach"

export type VideoCourseDetailsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string | null
  mode: VideoCourseDetailsMode
  listHref: string
  onSaved?: () => void
}

export function VideoCourseDetailsDialog({
  open,
  onOpenChange,
  courseId,
  mode,
  listHref,
  onSaved,
}: VideoCourseDetailsDialogProps) {
  const router = useRouter()
  const formId = useId()
  const { user, isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetchDone, setFetchDone] = useState(false)
  const [courseExists, setCourseExists] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [published, setPublished] = useState(false)
  const [visibility, setVisibility] = useState<VideoCourseVisibility>("coach_clients")
  const [order, setOrder] = useState(0)
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [savingMeta, setSavingMeta] = useState(false)
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false)
  const courseIdForDeleteRef = useRef<string | null>(null)

  const [ownerId, setOwnerId] = useState<string | null>(null)

  const applyFetchedCourse = useCallback(
    (data: NonNullable<Awaited<ReturnType<typeof fetchVideoCourseWithStructure>>>) => {
      setCourseExists(true)
      setOwnerId(data.course.ownerId)
      setTitle(data.course.title)
      setDescription(data.course.description)
      setPublished(data.course.published)
      setVisibility(data.course.visibility)
      setOrder(data.course.order)
      setThumbnailUrl(data.course.thumbnailUrl)
    },
    []
  )

  const load = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const data = await fetchVideoCourseWithStructure(courseId)
      if (data) {
        applyFetchedCourse(data)
      } else {
        setCourseExists(false)
        setOwnerId(null)
      }
    } finally {
      setLoading(false)
      setFetchDone(true)
    }
  }, [courseId, applyFetchedCourse])

  const refreshFieldsQuiet = useCallback(async () => {
    if (!courseId) return
    const data = await fetchVideoCourseWithStructure(courseId)
    if (data) applyFetchedCourse(data)
  }, [courseId, applyFetchedCourse])

  useEffect(() => {
    if (!open || !courseId) {
      setFetchDone(false)
      return
    }
    setFetchDone(false)
    void load()
  }, [open, courseId, load])

  const canEditCourse = useMemo(() => {
    if (!courseId || !user?.uid || ownerId == null) return false
    if (mode === "admin" && isAdmin) return true
    if (mode === "coach" && ownerId === user.uid) return true
    return false
  }, [courseId, user?.uid, ownerId, mode, isAdmin])

  const saveMeta = async () => {
    if (!canEditCourse || !courseId) return
    setSavingMeta(true)
    try {
      await updateVideoCourse(courseId, {
        title: title.trim(),
        description: description.trim(),
        published,
        visibility: mode === "admin" ? visibility : "coach_clients",
        order,
      })
      await refreshFieldsQuiet()
      onSaved?.()
      onOpenChange(false)
    } finally {
      setSavingMeta(false)
    }
  }

  const onThumbnailUploaded = async (url: string) => {
    setThumbnailUrl(url)
    if (canEditCourse && courseId) {
      await updateVideoCourse(courseId, { thumbnailUrl: url })
      await refreshFieldsQuiet()
      onSaved?.()
    }
  }

  const confirmDeleteCourse = async () => {
    const id = courseIdForDeleteRef.current
    if (!id) return
    await deleteVideoCourse(id)
    courseIdForDeleteRef.current = null
    setDeleteCourseOpen(false)
    onSaved?.()
    router.push(listHref)
  }

  const titleId = `${formId}-title`
  const descId = `${formId}-desc`
  const orderId = `${formId}-order`
  const pubId = `${formId}-pub`

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Course details</DialogTitle>
          </DialogHeader>
          {!fetchDone || loading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading…</p>
          ) : !courseExists ? (
            <p className="py-4 text-sm text-muted-foreground">Course not found.</p>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor={titleId}>Title</Label>
                <Input id={titleId} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEditCourse} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={descId}>Description</Label>
                <Textarea
                  id={descId}
                  rows={3}
                  className="min-h-[72px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Shown on the course card for students…"
                  disabled={!canEditCourse}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={orderId}>List sort order</Label>
                  <Input
                    id={orderId}
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value) || 0)}
                    disabled={!canEditCourse}
                  />
                </div>
                {mode === "admin" && (
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select
                      value={visibility}
                      onValueChange={(v) => setVisibility(v as VideoCourseVisibility)}
                      disabled={!canEditCourse}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_students">All students</SelectItem>
                        <SelectItem value="coach_clients">Coach clients only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch id={pubId} checked={published} onCheckedChange={setPublished} disabled={!canEditCourse} />
                <Label htmlFor={pubId}>Published</Label>
              </div>
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                {courseId ? (
                  <CourseThumbnailField
                    courseId={courseId}
                    thumbnailUrl={thumbnailUrl}
                    onUploaded={onThumbnailUploaded}
                    disabled={!canEditCourse}
                  />
                ) : null}
              </div>
            </div>
          )}
          <DialogFooter className="mt-2 border-t pt-4">
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {canEditCourse && courseId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                  onClick={() => {
                    courseIdForDeleteRef.current = courseId
                    onOpenChange(false)
                    setDeleteCourseOpen(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete course
                </Button>
              ) : (
                <span />
              )}
              <div className="flex w-full justify-end gap-2 sm:w-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveMeta()} disabled={savingMeta || !canEditCourse || loading}>
                  {savingMeta ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteCourseOpen}
        onOpenChange={(o) => {
          setDeleteCourseOpen(o)
          if (!o) courseIdForDeleteRef.current = null
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              All modules and lessons will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteCourse()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
