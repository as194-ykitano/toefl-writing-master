"use client";

// レッスン表示（english-gym-admin の学生レッスン画面を移植）。
import { useEffect, useState } from "react";
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
  const [guidePreview, setGuidePreview] = useState<boolean | null>(null);
  useEffect(() => {
    setGuidePreview(new URLSearchParams(window.location.search).get("guide") === "1");
  }, []);

  return (
    <PrepShell>
      {guidePreview === null ? (
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
      ) : !courseId || !lessonId ? (
        <div className="p-6 text-sm text-muted-foreground">無効なレッスンリンクです。</div>
      ) : (
        <CourseLessonView
          courseId={courseId}
          lessonId={lessonId}
          coursesIndexHref="/video-courses"
          lessonPathPrefix="/video-courses"
          role="student"
          guidePreview={guidePreview}
        />
      )}
    </PrepShell>
  );
}
