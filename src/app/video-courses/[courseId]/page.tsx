"use client";

// コース詳細 = 最初のレッスンへリダイレクト（english-gym-admin の学生アウトライン画面を移植）。
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PrepShell from "@/components/prep/PrepShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  fetchVideoCourseWithStructure,
  flattenLessonOrder,
  studentCanViewPublishedCourse,
} from "@/lib/video-course-queries";

function pickSegment(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

export default function StudentVideoCourseOutlinePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = pickSegment(params.courseId) ?? "";
  const { studentData } = useAuth();
  const coachUid = studentData?.coach;
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [firstLessonId, setFirstLessonId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId) {
      setAllowed(false);
      setFirstLessonId(null);
      return;
    }
    const structure = await fetchVideoCourseWithStructure(courseId);
    if (!structure) {
      setAllowed(false);
      setFirstLessonId(null);
      return;
    }
    const ok = studentCanViewPublishedCourse(structure.course, coachUid);
    setAllowed(ok);
    if (!ok) {
      setFirstLessonId(null);
      return;
    }
    const flat = flattenLessonOrder(structure.modules, structure.lessons);
    setFirstLessonId(flat[0]?.id ?? null);
  }, [courseId, coachUid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (loading || !allowed) return;
    if (firstLessonId) {
      router.replace(`/video-courses/${courseId}/lessons/${firstLessonId}`);
    }
  }, [loading, allowed, firstLessonId, courseId, router]);

  return (
    <PrepShell>
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          読み込み中…
        </div>
      ) : !allowed ? (
        <div className="mx-auto max-w-lg space-y-4 p-6">
          <p className="text-sm text-muted-foreground">このコースは表示できません。</p>
          <Button variant="outline" asChild>
            <Link href="/video-courses">コース一覧へ戻る</Link>
          </Button>
        </div>
      ) : !firstLessonId ? (
        <div className="mx-auto max-w-lg space-y-4 p-6">
          <p className="text-sm text-muted-foreground">このコースにはまだレッスンがありません。</p>
          <Button variant="outline" asChild>
            <Link href="/video-courses">コース一覧へ戻る</Link>
          </Button>
        </div>
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          コースを開いています…
        </div>
      )}
    </PrepShell>
  );
}
