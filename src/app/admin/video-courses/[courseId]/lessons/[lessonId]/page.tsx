"use client";

// 管理者：レッスン編集ビュー（プレビュー + 構造エディタ + コース設定ダイアログ）を移植。
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourseLessonView } from "@/components/video-courses/course-lesson-view";
import { VideoCourseDetailsDialog } from "@/components/video-courses/video-course-details-dialog";

function pickSegment(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

export default function AdminVideoCourseLessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = pickSegment(params.courseId) ?? "";
  const lessonId = pickSegment(params.lessonId) ?? "";
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!courseId || !lessonId) {
    return <div className="p-6 text-sm text-muted-foreground">無効なレッスンリンクです。</div>;
  }

  return (
    <>
      <CourseLessonView
        courseId={courseId}
        lessonId={lessonId}
        coursesIndexHref="/admin/video-courses"
        lessonPathPrefix="/admin/video-courses"
        role="staff"
        onStaffOpenCourseDetails={() => setDetailsOpen(true)}
      />
      <VideoCourseDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        courseId={courseId}
        mode="admin"
        listHref="/admin/video-courses"
        onSaved={() => router.refresh()}
      />
    </>
  );
}
