"use client";

// コンテンツ（動画コース一覧）— english-gym-admin の学生向けコンテンツ画面を移植。
// UI は PrepMaster の見た目（PrepShell 内・日本語）に合わせ、UX/機能はそのまま。
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoCourseCatalogCard } from "@/components/video-courses/video-course-catalog-card";
import { useAuth } from "@/lib/auth-context";
import {
  fetchStudentVideoCourseCatalog,
  type StudentVideoCourseCatalogRow,
} from "@/lib/video-course-queries";

export default function StudentVideoCoursesPage() {
  const { user, studentData } = useAuth();
  const coachUid = studentData?.coach;
  const [rows, setRows] = useState<StudentVideoCourseCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    const data = await fetchStudentVideoCourseCatalog(user.uid, coachUid);
    setRows(data);
  }, [user?.uid, coachUid]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ course, creatorLabel }) => {
      const hay = [course.title, course.description, creatorLabel].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <PrepShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">コンテンツ</h1>
            <p className="text-sm text-muted-foreground">動画コースを探す</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="コースを検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              aria-label="コースを検索"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] w-full animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-violet-500/[0.06] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)]">
            <CardHeader className="gap-4 pb-2">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-violet-500/30 text-primary shadow-md ring-2 ring-primary/15"
                  aria-hidden
                >
                  <Sparkles className="h-7 w-7" strokeWidth={2} />
                </span>
                <div className="min-w-0 space-y-2">
                  <CardTitle className="text-balance text-lg font-semibold leading-snug sm:text-xl">
                    新しいコースはまもなく公開されます
                  </CardTitle>
                  <CardDescription className="text-balance text-base leading-relaxed text-muted-foreground">
                    レッスンをどんどん追加予定です。またのぞきに来てくださいね
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">検索に一致するコースがありません。</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ course, totalLessons, completedCount, creatorLabel }) => (
              <VideoCourseCatalogCard
                key={course.id}
                course={course}
                mainHref={`/video-courses/${course.id}`}
                lessonCount={totalLessons}
                completedCount={completedCount}
                totalLessons={totalLessons}
                creatorLabel={creatorLabel}
                courseAudienceLabel={course.visibility === "coach_clients" ? "コーチ限定" : "全員"}
              />
            ))}
          </div>
        )}
      </div>
    </PrepShell>
  );
}
