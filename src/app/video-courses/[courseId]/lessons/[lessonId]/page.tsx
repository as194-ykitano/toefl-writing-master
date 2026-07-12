"use client";

// レッスン表示（english-gym-admin の学生レッスン画面を移植）。
import { useParams } from "next/navigation";
import PrepShell from "@/components/prep/PrepShell";
import { CourseLessonView } from "@/components/video-courses/course-lesson-view";

function pickSegment(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

export default function StudentVideoCourseLessonPage() {
  const params = useParams();
  const courseId = pickSegment(params.courseId) ?? "";
  const lessonId = pickSegment(params.lessonId) ?? "";

  return (
    <PrepShell>
      {!courseId || !lessonId ? (
        <div className="p-6 text-sm text-muted-foreground">無効なレッスンリンクです。</div>
      ) : (
        <CourseLessonView
          courseId={courseId}
          lessonId={lessonId}
          coursesIndexHref="/video-courses"
          lessonPathPrefix="/video-courses"
          role="student"
        />
      )}
    </PrepShell>
  );
}
