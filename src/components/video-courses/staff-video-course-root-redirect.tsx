"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  createVideoCourseLesson,
  createVideoCourseModule,
  fetchVideoCourseWithStructure,
  flattenLessonOrder,
  staffCanPreviewVideoCourse,
} from "@/lib/video-course-queries"

function pickSegment(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value) && value[0]) return value[0]
  return undefined
}

type Mode = "admin" | "coach"

export function StaffVideoCourseRootRedirect({ mode }: { mode: Mode }) {
  const params = useParams()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const courseId = pickSegment(params.courseId) ?? ""
  const listHref = mode === "admin" ? "/admin/video-courses" : "/coach/video-courses"
  const lessonPrefix = mode === "admin" ? "/admin/video-courses" : "/coach/video-courses"

  const [phase, setPhase] = useState<"loading" | "denied" | "missing" | "bootstrapping">("loading")

  const run = useCallback(async () => {
    if (!courseId) {
      setPhase("missing")
      return
    }
    if (!user?.uid) {
      setPhase("denied")
      return
    }
    const structure = await fetchVideoCourseWithStructure(courseId)
    if (!structure) {
      setPhase("missing")
      return
    }
    if (!staffCanPreviewVideoCourse(structure.course, user.uid, isAdmin)) {
      setPhase("denied")
      return
    }
    const flat = flattenLessonOrder(structure.modules, structure.lessons)
    if (flat.length > 0) {
      router.replace(`${lessonPrefix}/${courseId}/lessons/${flat[0]!.id}`)
      return
    }
    const canEdit =
      (mode === "admin" && isAdmin) || (mode === "coach" && structure.course.ownerId === user.uid)
    if (canEdit) {
      setPhase("bootstrapping")
      const mid = await createVideoCourseModule({ courseId, title: "New module", order: 1 })
      const lid = await createVideoCourseLesson({
        courseId,
        moduleId: mid,
        title: "New lesson",
        order: 1,
        contentType: "video",
        body: "",
      })
      router.replace(`${lessonPrefix}/${courseId}/lessons/${lid}`)
      return
    }
    setPhase("denied")
  }, [courseId, user?.uid, isAdmin, mode, router, lessonPrefix])

  useEffect(() => {
    void run()
  }, [run])

  if (phase === "loading" || phase === "bootstrapping") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        {phase === "bootstrapping" ? "Preparing course…" : "Loading…"}
      </div>
    )
  }

  if (phase === "missing") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Button variant="outline" asChild>
          <Link href={listHref}>Back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <p className="text-sm text-muted-foreground">This course is not available.</p>
      <Button variant="outline" asChild>
        <Link href={listHref}>Back</Link>
      </Button>
    </div>
  )
}
