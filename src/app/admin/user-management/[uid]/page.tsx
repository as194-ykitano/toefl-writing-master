"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Award, BarChart3, BookOpen, CalendarClock, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Circle, Clock, ExternalLink, FileText, GraduationCap,
  KeyRound, ListChecks, Mail, Mic, PenLine, Target, Timer, TrendingUp, X,
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminHistoryView, AdminOverviewView, AdminStudyTimeView } from "@/components/admin/AdminStudentLearningViews";

// APIレスポンスの型
interface FeedbackShape {
  overall?: string;
  strengths?: string[];
  improvements?: string[];
  detailedScores?: Record<string, number | undefined>;
  grammarCorrections?: { corrections?: Array<{ original: string; corrected: string; explanation: string }> };
}
interface DetailEssay {
  id: string;
  collection: string;
  examType: string;
  content: string;
  status?: string;
  score?: number;
  wordCount?: number;
  timeSpent?: number;
  submittedAt?: string;
  feedback?: FeedbackShape;
  videoTitle?: string;
}
interface DetailUser {
  uid: string;
  email: string;
  displayName: string;
  lastNameRomaji?: string;
  firstNameRomaji?: string;
  photoURL: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  trainingPermissions: Record<string, boolean> | null;
  onboarding: {
    learnerStatus?: string; learningReason?: string; targetExam?: string;
    targetScore?: number; targetDate?: string; completedAt?: string;
  } | null;
  learningGoals: {
    targetScore?: number; targetDate?: string; weeklyGoal?: number;
    learningPlan?: string; focusAreas?: string[];
  } | null;
  progress: { currentScore?: number; essaysCompleted?: number; lastSubmission?: string | null } | null;
  studySessions: Array<{ date?: string; duration?: number; focus?: string }>;
  totalStudyTime: number;
  dailyStudyGoalMinutes: number;
  reminder: { enabled?: boolean; time?: string; days?: string[] } | null;
}
interface DetailStats {
  totalEssays: number;
  feedbackCompleted: number;
  averageScore: number | null;
  totalWords: number;
  byExamType: Record<string, number>;
  lastSubmission: string | null;
}
interface LearningActivity {
  id: string;
  kind: "session" | "writing";
  exam: "toefl" | "ielts" | "toeic";
  skill: "reading" | "listening" | "speaking" | "writing";
  practiceType: string;
  practiceTypeLabel: string;
  title: string;
  finishedAt: string;
  durationSec: number;
  correctCount: number | null;
  totalCount: number | null;
  scoreValue: number | null;
  scoreMax: number;
  wordCount: number | null;
  wpm: number | null;
  feedbackSummary: string | null;
  strengths: string[];
  improvements: string[];
}
interface LearningAnalytics {
  summary: {
    totalStudyMinutes: number; totalActivities: number; questionsAnswered: number;
    submissions: number; averageAccuracy: number | null; activeDays: number; lastActivityAt: string | null;
  };
  byExamSkill: Array<{
    exam: "toefl" | "ielts" | "toeic"; skill: "reading" | "listening" | "speaking" | "writing";
    attempts: number; studyMinutes: number; averageScore: number | null; scoreMax: number;
  }>;
  daily: Array<{ date: string; minutes: number; activities: number; questions: number }>;
  activities: LearningActivity[];
  contentProgress: Array<{
    exam: "toefl" | "ielts" | "toeic"; skill: "reading" | "listening" | "speaking" | "writing";
    practiceType: string; label: string; completed: number; total: number; attempts: number; percent: number;
  }>;
}
interface DetailResponse {
  user: DetailUser;
  essays: DetailEssay[];
  stats: DetailStats;
  learning: LearningAnalytics;
  courseProgress: Array<{
    courseId: string; title: string; completedLessons: number; totalLessons: number; percent: number;
    modules: Array<{
      moduleId: string; title: string;
      lessons: Array<{ lessonId: string; title: string; completed: boolean }>;
    }>;
  }>;
}

const PERMISSION_LABELS: Record<string, string> = {
  toefl: "TOEFL Integrated",
  toeflAcademicDiscussion: "TOEFL Academic Discussion",
  ielts: "IELTS",
  basic: "Basic",
  youtuber: "YouTube Learning",
};

const LEARNER_STATUS_LABELS: Record<string, string> = {
  junior_high: "中学生",
  high_school: "高校生",
  university: "大学生・専門学校生",
  working: "社会人",
  other: "その他",
};

const EXAM_LABELS: Record<string, string> = { toefl: "TOEFL", ielts: "IELTS", toeic: "TOEIC" };

const STATUS_LABELS: Record<string, string> = {
  completed: "完了", processing: "処理中", feedback_completed: "フィードバック完了",
  error: "エラー", pending: "処理待ち",
};

const TABS = [
  { key: "activity", label: "学習時間", icon: Clock },
  { key: "history", label: "学習履歴", icon: ListChecks },
  { key: "overview", label: "データ推移", icon: BarChart3 },
  { key: "progress", label: "コンテンツ進捗", icon: ListChecks },
  { key: "essays", label: "添削・提出物", icon: FileText },
  { key: "exam", label: "受験目標", icon: Target },
  { key: "study", label: "旧仕様", icon: BookOpen },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ja-JP");
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP");
}
function fmtMinutes(min?: number) {
  if (!min) return "0分";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

function fmtDuration(sec: number) {
  return fmtMinutes(Math.max(0, Math.round(sec / 60)));
}

function fmtScore(activity: LearningActivity) {
  if (activity.scoreValue == null) return "—";
  if (activity.skill === "reading" || activity.skill === "listening") return `${activity.scoreValue.toFixed(1)}%`;
  return `${activity.scoreValue.toFixed(1)} / ${activity.scoreMax}`;
}

function localYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing",
};

export default function UserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("activity");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [savingPerm, setSavingPerm] = useState(false);
  const [selectedEssay, setSelectedEssay] = useState<DetailEssay | null>(null);
  const [studyPeriod, setStudyPeriod] = useState<"week" | "month">("week");
  const [studyOffset, setStudyOffset] = useState(0);
  const [openProgressGroups, setOpenProgressGroups] = useState<Record<string, boolean>>({});
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [outputKind, setOutputKind] = useState<"speaking" | "writing">("speaking");
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);

  const adminFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("認証が必要です。");
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "処理に失敗しました。");
    return body;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await adminFetch(`/api/admin/users/${uid}`)) as DetailResponse;
      setData(res);
      setPermissions(res.user.trainingPermissions ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "読込に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [adminFetch, uid]);

  useEffect(() => auth.onAuthStateChanged((u) => { if (u) load(); }), [load]);

  const user = data?.user;
  const stats = data?.stats;

  const sessions = useMemo(
    () => [...(user?.studySessions ?? [])].sort((a, b) => Date.parse(b.date ?? "") - Date.parse(a.date ?? "")),
    [user],
  );

  const studyRange = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let start: Date;
    let end: Date;
    if (studyPeriod === "week") {
      start = new Date(today);
      start.setDate(start.getDate() - start.getDay() + studyOffset * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else {
      start = new Date(today.getFullYear(), today.getMonth() + studyOffset, 1, 12);
      end = new Date(today.getFullYear(), today.getMonth() + studyOffset + 1, 0, 12);
    }
    const rows = (data?.learning.daily ?? []).filter((row) => row.date >= localYmd(start) && row.date <= localYmd(end));
    const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);
    const averageMinutes = rows.length ? Math.round(totalMinutes / rows.length) : 0;
    const label = studyPeriod === "week"
      ? `${start.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}〜${end.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`
      : start.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    return { rows, totalMinutes, averageMinutes, activeDays: rows.filter((row) => row.minutes > 0).length, label };
  }, [data?.learning.daily, studyOffset, studyPeriod]);

  const outputRows = useMemo(() => (data?.learning.activities ?? []).filter((activity) => activity.skill === outputKind), [data?.learning.activities, outputKind]);
  const selectedOutput = outputRows.find((activity) => activity.id === selectedOutputId) ?? outputRows[0] ?? null;
  const selectedCourse = data?.courseProgress.find((course) => course.courseId === selectedCourseId) ?? null;
  const progressExams = useMemo(() => {
    const rows = data?.learning.contentProgress ?? [];
    const examIds = [...new Set(rows.map((row) => row.exam))];
    const target = data?.user.onboarding?.targetExam;
    examIds.sort((a, b) => (a === target ? -1 : b === target ? 1 : a.localeCompare(b)));
    return examIds.map((exam) => ({
      exam,
      skills: [...new Set(rows.filter((row) => row.exam === exam).map((row) => row.skill))].map((skill) => ({
        skill,
        rows: rows.filter((row) => row.exam === exam && row.skill === skill),
      })),
    }));
  }, [data?.learning.contentProgress, data?.user.onboarding?.targetExam]);

  const toggleProgressGroup = (key: string, defaultOpen: boolean) => {
    setOpenProgressGroups((current) => ({ ...current, [key]: !(current[key] ?? defaultOpen) }));
  };

  async function savePermissions() {
    try {
      setSavingPerm(true);
      await adminFetch(`/api/admin/users/${uid}`, { method: "PATCH", body: JSON.stringify({ trainingPermissions: permissions }) });
      await load();
      alert("トレーニング権限を更新しました。");
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新に失敗しました。");
    } finally {
      setSavingPerm(false);
    }
  }

  async function resetPassword() {
    if (!user) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`${user.email} にパスワード再設定メールを送信しました。`);
    } catch {
      alert("パスワード再設定メールの送信に失敗しました。");
    }
  }

  if (loading) return <div className="grid min-h-[60vh] place-items-center">読み込み中...</div>;
  if (error || !user || !stats) {
    return (
      <div className="grid min-h-[60vh] place-items-center gap-4 text-center">
        <p className="text-slate-500">{error ?? "ユーザーが見つかりません。"}</p>
        <Button variant="outline" onClick={() => router.push("/admin/user-management")}><ArrowLeft className="h-4 w-4" />一覧へ戻る</Button>
      </div>
    );
  }

  const permDirty = JSON.stringify(permissions) !== JSON.stringify(user.trainingPermissions ?? {});

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/admin/user-management")}>
        <ArrowLeft className="h-4 w-4" />ユーザー一覧へ戻る
      </Button>

      {/* ヘッダー */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt={user.displayName} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  {(user.displayName || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{user.displayName || "名前未設定"}</h1>
                {(user.lastNameRomaji || user.firstNameRomaji) && (
                  <p className="text-sm text-slate-400">{`${user.lastNameRomaji ?? ""} ${user.firstNameRomaji ?? ""}`.trim()}</p>
                )}
                <p className="flex items-center gap-1.5 text-sm text-slate-500"><Mail className="h-3.5 w-3.5" />{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{user.isActive ? "利用中" : "利用停止"}</Badge>
                  {user.role === "admin" && <Badge className="bg-purple-100 text-purple-800">管理者</Badge>}
                  {user.onboarding?.targetExam && <Badge variant="outline">対策: {EXAM_LABELS[user.onboarding.targetExam] ?? user.onboarding.targetExam}</Badge>}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetPassword}><KeyRound className="h-4 w-4" />パスワード再設定</Button>
          </div>

          {/* クイック統計 */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={ListChecks} label="新演習の実施数" value={String(data.learning.summary.totalActivities)} />
            <Stat icon={Award} label="平均正答率" value={data.learning.summary.averageAccuracy != null ? `${data.learning.summary.averageAccuracy.toFixed(1)}%` : "—"} />
            <Stat icon={Clock} label="新演習の学習時間" value={fmtMinutes(data.learning.summary.totalStudyMinutes)} />
            <Stat icon={CalendarClock} label="最終ログイン" value={fmtDate(user.lastLoginAt)} />
          </div>
        </CardContent>
      </Card>

      {/* タブ */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* 受験情報 */}
      {tab === "exam" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" />受験目標（オンボーディング）</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {user.onboarding ? (
                <>
                  <Field label="対策する試験" value={user.onboarding.targetExam ? EXAM_LABELS[user.onboarding.targetExam] ?? user.onboarding.targetExam : "—"} />
                  <Field label="目標スコア" value={user.onboarding.targetScore != null ? String(user.onboarding.targetScore) : "—"} />
                  <Field label="目標時期" value={fmtDate(user.onboarding.targetDate)} />
                  <Field label="学年・立場" value={user.onboarding.learnerStatus ? LEARNER_STATUS_LABELS[user.onboarding.learnerStatus] ?? user.onboarding.learnerStatus : "—"} />
                  <div>
                    <p className="text-xs text-slate-500">英語を学ぶ理由</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 dark:bg-slate-800">{user.onboarding.learningReason || "—"}</p>
                  </div>
                  <Field label="オンボーディング完了" value={fmtDate(user.onboarding.completedAt)} />
                </>
              ) : <p className="text-slate-500">オンボーディング情報が未登録です。</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4" />学習目標</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {user.learningGoals ? (
                <>
                  <Field label="目標スコア" value={user.learningGoals.targetScore != null ? String(user.learningGoals.targetScore) : "—"} />
                  <Field label="目標日" value={fmtDate(user.learningGoals.targetDate)} />
                  <Field label="週間目標" value={user.learningGoals.weeklyGoal != null ? `${user.learningGoals.weeklyGoal} 本／週` : "—"} />
                  {user.learningGoals.focusAreas?.length ? (
                    <div>
                      <p className="text-xs text-slate-500">重点分野</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">{user.learningGoals.focusAreas.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}</div>
                    </div>
                  ) : null}
                  {user.learningGoals.learningPlan && (
                    <div>
                      <p className="text-xs text-slate-500">学習プラン</p>
                      <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 dark:bg-slate-800">{user.learningGoals.learningPlan}</p>
                    </div>
                  )}
                </>
              ) : <p className="text-slate-500">学習目標が未設定です。</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 学習管理 */}
      {tab === "study" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">利用可能なトレーニング</CardTitle>
              <Button size="sm" disabled={!permDirty || savingPerm} onClick={savePermissions}>{savingPerm ? "保存中..." : "変更を保存"}</Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {Object.keys(PERMISSION_LABELS).map((key) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <Label htmlFor={`perm-${key}`} className="text-sm">{PERMISSION_LABELS[key]}</Label>
                  <Switch id={`perm-${key}`} checked={!!permissions[key]} onCheckedChange={(c) => setPermissions((p) => ({ ...p, [key]: c }))} />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Stat card icon={Clock} label="旧仕様の学習時間" value={fmtMinutes(user.totalStudyTime)} />
            <Stat card icon={TrendingUp} label="旧仕様の現在スコア" value={user.progress?.currentScore != null ? String(user.progress.currentScore) : "—"} />
            <Stat card icon={CalendarClock} label="旧仕様の最終提出" value={fmtDate(user.progress?.lastSubmission ?? stats.lastSubmission)} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">学習セッション履歴</CardTitle></CardHeader>
            <CardContent>
              {sessions.length ? (
                <div className="space-y-2">
                  {sessions.slice(0, 30).map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                      <span>{fmtDate(s.date)}</span>
                      <span className="text-slate-500">{s.focus || "—"}</span>
                      <span className="flex items-center gap-1 text-slate-500"><Timer className="h-3.5 w-3.5" />{fmtMinutes(s.duration)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">学習セッションの記録はありません。</p>}
              {user.reminder?.enabled && (
                <p className="mt-4 text-xs text-slate-500">リマインダー: 毎{(user.reminder.days ?? []).join("・") || "—"} {user.reminder.time}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 添削・提出物 */}
      {tab === "essays" && (
        <div className="space-y-4">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(["speaking","writing"] as const).map((kind)=>{const Icon=kind==="speaking"?Mic:PenLine;return <button key={kind} type="button" onClick={()=>{setOutputKind(kind);setSelectedOutputId(null)}} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${outputKind===kind?"bg-white shadow-sm dark:bg-slate-950":"text-slate-500"}`}><Icon className="h-4 w-4"/>{kind==="speaking"?"Speaking":"Writing"}</button>})}
          </div>
          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit"><CardHeader><CardTitle className="text-sm">Output log</CardTitle></CardHeader><CardContent className="space-y-2 p-3 pt-0">{outputRows.length?outputRows.map((output)=><button key={output.id} type="button" onClick={()=>setSelectedOutputId(output.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedOutput?.id===output.id?"border-orange-400 bg-orange-50/60 dark:bg-orange-950/20":"border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}><div className="flex items-center gap-2"><Badge variant="outline">{output.exam.toUpperCase()}</Badge><span className="ml-auto text-xs text-slate-400">{fmtDate(output.finishedAt)}</span></div><p className="mt-2 line-clamp-2 text-sm font-medium">{output.title}</p><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{fmtScore(output)}</span><span>{output.wordCount?`${output.wordCount} words`:fmtDuration(output.durationSec)}</span></div></button>):<p className="py-8 text-center text-sm text-slate-500">{outputKind==="speaking"?"Speaking":"Writing"}の提出はありません。</p>}</CardContent></Card>
            <Card><CardContent className="p-6">{selectedOutput?<div className="space-y-5"><div><div className="flex flex-wrap items-center gap-2"><Badge>{selectedOutput.exam.toUpperCase()}</Badge><Badge variant="secondary">{selectedOutput.practiceTypeLabel}</Badge><span className="ml-auto text-xs text-slate-400">{fmtDateTime(selectedOutput.finishedAt)}</span></div><h3 className="mt-3 text-lg font-semibold">{selectedOutput.title}</h3></div><div className="grid grid-cols-3 gap-3"><MiniMetric label="スコア" value={fmtScore(selectedOutput)}/><MiniMetric label="学習時間" value={fmtDuration(selectedOutput.durationSec)}/><MiniMetric label={outputKind==="speaking"?"発話語数":"語数"} value={selectedOutput.wordCount!=null?String(selectedOutput.wordCount):"—"}/></div>{selectedOutput.feedbackSummary&&<div><p className="mb-1 text-xs font-medium text-slate-500">フィードバック概要</p><p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed dark:bg-slate-800">{selectedOutput.feedbackSummary}</p></div>}{selectedOutput.strengths.length>0&&<div><p className="mb-1 text-xs font-medium text-emerald-700">良い点</p><ul className="space-y-1 text-sm">{selectedOutput.strengths.slice(0,3).map((item,index)=><li key={index}>• {item}</li>)}</ul></div>}{selectedOutput.improvements.length>0&&<div><p className="mb-1 text-xs font-medium text-amber-700">改善点</p><ul className="space-y-1 text-sm">{selectedOutput.improvements.slice(0,3).map((item,index)=><li key={index}>• {item}</li>)}</ul></div>}<a href={`${selectedOutput.kind==="writing"?`/writing-result/${selectedOutput.id}`:`/results/${selectedOutput.id}`}?adminUid=${uid}`} target="_blank" rel="noreferrer"><Button className="w-full"><ExternalLink className="h-4 w-4"/>生徒と同じフィードバックページを開く</Button></a></div>:<div className="grid min-h-72 place-items-center text-sm text-slate-500">左のアウトプットを選択してください。</div>}</CardContent></Card>
          </div>
          {outputKind==="writing"&&data.essays.length>0&&<Card><CardHeader><CardTitle className="text-sm">旧仕様のWriting提出（{data.essays.length}件）</CardTitle></CardHeader><CardContent className="space-y-2">{data.essays.map((essay)=><button key={`${essay.collection}-${essay.id}`} onClick={()=>setSelectedEssay(essay)} className="flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Badge variant="outline">{essay.examType}</Badge><span className="truncate">{essay.videoTitle||essay.content?.slice(0,80)||"提出内容"}</span><span className="ml-auto whitespace-nowrap text-xs text-slate-400">{fmtDate(essay.submittedAt)}</span></button>)}</CardContent></Card>}
        </div>
      )}

      {tab === "activity" && <AdminStudyTimeView uid={uid} items={data.learning.activities} initialExam={(user.onboarding?.targetExam === "ielts" || user.onboarding?.targetExam === "toeic") ? user.onboarding.targetExam : "toefl"} />}
      {tab === "history" && <AdminHistoryView uid={uid} items={data.learning.activities} initialExam={(user.onboarding?.targetExam === "ielts" || user.onboarding?.targetExam === "toeic") ? user.onboarding.targetExam : "toefl"} />}
      {tab === "overview" && <AdminOverviewView uid={uid} items={data.learning.activities} initialExam={(user.onboarding?.targetExam === "ielts" || user.onboarding?.targetExam === "toeic") ? user.onboarding.targetExam : "toefl"} />}

      {/* 旧Admin独自の学習データ表示（生徒画面準拠へ置換済み） */}
      {false && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4 border-b dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">学習時間</CardTitle>
                <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  {(["week", "month"] as const).map((period) => <button key={period} type="button" onClick={()=>{setStudyPeriod(period);setStudyOffset(0)}} className={`rounded-md px-4 py-1.5 text-sm ${studyPeriod===period?"bg-white font-medium shadow-sm dark:bg-slate-950":"text-slate-500"}`}>{period==="week"?"週":"月"}</button>)}
                </div>
              </div>
              <div className="flex items-center justify-center gap-3"><Button variant="outline" size="sm" onClick={()=>setStudyOffset((value)=>value-1)}><ChevronLeft className="h-4 w-4"/></Button><span className="min-w-40 text-center text-sm font-medium">{studyRange.label}</span><Button variant="outline" size="sm" disabled={studyOffset>=0} onClick={()=>setStudyOffset((value)=>Math.min(0,value+1))}><ChevronRight className="h-4 w-4"/></Button></div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat icon={Clock} label={studyPeriod==="week"?"週間学習時間":"月間学習時間"} value={fmtMinutes(studyRange.totalMinutes)}/>
                <Stat icon={TrendingUp} label="1日平均" value={fmtMinutes(studyRange.averageMinutes)}/>
                <Stat icon={Target} label="1日の目標" value={fmtMinutes(user!.dailyStudyGoalMinutes)}/>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>日別の学習時間</span><span>学習あり {studyRange.activeDays}日</span></div>
                <div className="flex h-56 items-end gap-1.5 border-b border-slate-200 dark:border-slate-700" aria-label="日別の学習時間グラフ">
                {studyRange.rows.map((day) => {
                  const max = Math.max(1, user!.dailyStudyGoalMinutes, ...studyRange.rows.map((point) => point.minutes));
                  const height = day.minutes ? Math.max(3, Math.round((day.minutes / max) * 100)) : 1;
                  return (
                    <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${fmtDate(day.date)}: ${day.minutes}分 / ${day.activities}回`}>
                      <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/70" style={{bottom:`${Math.round((user!.dailyStudyGoalMinutes/max)*100)}%`}}/>
                      <div className="relative w-full rounded-t bg-orange-500/85 transition-colors group-hover:bg-orange-600" style={{ height: `${height}%` }} />
                    </div>
                  );
                })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{fmtDate(studyRange.rows[0]?.date)}</span><span><span className="mr-1 inline-block w-4 border-t border-dashed border-emerald-500"/>目標 {user!.dailyStudyGoalMinutes}分</span><span>{fmtDate(studyRange.rows.at(-1)?.date)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">試験・技能別データ</CardTitle></CardHeader>
            <CardContent>
              {data!.learning.byExamSkill.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data!.learning.byExamSkill.map((row) => (
                    <div key={`${row.exam}-${row.skill}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-center justify-between"><Badge variant="secondary">{row.exam.toUpperCase()}</Badge><span className="font-medium">{SKILL_LABELS[row.skill]}</span></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div><p className="text-slate-400">回数</p><p className="mt-1 font-semibold">{row.attempts}</p></div>
                        <div><p className="text-slate-400">時間</p><p className="mt-1 font-semibold">{fmtMinutes(row.studyMinutes)}</p></div>
                        <div><p className="text-slate-400">平均</p><p className="mt-1 font-semibold">{row.averageScore == null ? "—" : row.scoreMax === 100 ? `${row.averageScore.toFixed(1)}%` : `${row.averageScore.toFixed(1)}/${row.scoreMax}`}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">新仕様トレーニングの学習データはまだありません。</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">学習履歴（新しい順）</CardTitle></CardHeader>
            <CardContent>
              {data!.learning.activities.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-2 pr-3">日時</th><th className="py-2 pr-3">試験・技能</th><th className="py-2 pr-3">演習内容</th><th className="py-2 pr-3">スコア</th><th className="py-2 text-right">学習時間</th></tr></thead>
                    <tbody>{data!.learning.activities.map((activity) => (
                      <tr key={`${activity.kind}-${activity.id}`} className="border-b last:border-0 dark:border-slate-800">
                        <td className="py-3 pr-3 whitespace-nowrap text-slate-500">{fmtDateTime(activity.finishedAt)}</td>
                        <td className="py-3 pr-3"><Badge variant="outline">{activity.exam.toUpperCase()}</Badge><span className="ml-2">{SKILL_LABELS[activity.skill]}</span></td>
                        <td className="py-3 pr-3"><p className="font-medium">{activity.title}</p><p className="text-xs text-slate-400">{activity.practiceTypeLabel}</p></td>
                        <td className="py-3 pr-3 whitespace-nowrap">{fmtScore(activity)}</td>
                        <td className="py-3 text-right whitespace-nowrap">{fmtDuration(activity.durationSec)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-slate-500">学習履歴はまだありません。</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 演習セット・動画コースの進捗 */}
      {tab === "progress" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">問題タイプ別の演習進捗</CardTitle></CardHeader>
            <CardContent className="p-0">
              {progressExams.length ? (
                <div className="divide-y dark:divide-slate-800">
                  {progressExams.map((examGroup) => {
                    const examKey=`exam-${examGroup.exam}`;
                    const isTarget=examGroup.exam===user.onboarding?.targetExam;
                    const examOpen=openProgressGroups[examKey]??isTarget;
                    const examCompleted=examGroup.skills.flatMap((group)=>group.rows).reduce((sum,row)=>sum+row.completed,0);
                    const examTotal=examGroup.skills.flatMap((group)=>group.rows).reduce((sum,row)=>sum+row.total,0);
                    return <div key={examGroup.exam}><button type="button" onClick={()=>toggleProgressGroup(examKey,isTarget)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><ChevronRight className={`h-4 w-4 transition ${examOpen?"rotate-90":""}`}/><span className="font-semibold">{examGroup.exam.toUpperCase()}</span>{isTarget&&<Badge className="bg-orange-100 text-orange-700">対策中</Badge>}<span className="ml-auto text-xs text-slate-500">{examCompleted}/{examTotal}セット</span></button>{examOpen&&<div className="border-t bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30">{examGroup.skills.map((skillGroup)=>{const skillKey=`${examGroup.exam}-${skillGroup.skill}`;const skillOpen=openProgressGroups[skillKey]??isTarget;const completed=skillGroup.rows.reduce((sum,row)=>sum+row.completed,0);const total=skillGroup.rows.reduce((sum,row)=>sum+row.total,0);return <div key={skillGroup.skill} className="border-b last:border-0 dark:border-slate-800"><button type="button" onClick={()=>toggleProgressGroup(skillKey,isTarget)} className="flex w-full items-center gap-2 px-7 py-2.5 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800"><ChevronRight className={`h-3.5 w-3.5 transition ${skillOpen?"rotate-90":""}`}/><span className="text-sm font-medium">{SKILL_LABELS[skillGroup.skill]}</span><span className="ml-auto text-xs text-slate-500">{completed}/{total}</span></button>{skillOpen&&<div className="divide-y border-t bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">{skillGroup.rows.map((row)=><div key={row.practiceType} className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-3 px-12 py-2 text-sm"><span className="truncate">{row.label}</span><span className="text-right text-xs text-slate-500">{row.completed}/{row.total}</span><span className="text-right font-medium tabular-nums">{row.percent}%</span></div>)}</div>}</div>})}</div>}</div>;
                  })}
                </div>
              ) : <p className="text-sm text-slate-500">演習コンテンツがありません。</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">動画コース進捗</CardTitle></CardHeader>
            <CardContent>
              {data.courseProgress.length ? (
                <div className="divide-y dark:divide-slate-800">
                  {data.courseProgress.map((course) => (
                    <button type="button" onClick={()=>setSelectedCourseId(course.courseId)} key={course.courseId} className="w-full px-1 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-medium">{course.title}</span><span className="whitespace-nowrap text-slate-500">{course.completedLessons} / {course.totalLessons}（{course.percent}%）</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-violet-500" style={{ width: `${course.percent}%` }} /></div><p className="mt-1.5 text-xs text-slate-400">クリックしてモジュール・レッスン進捗を表示</p></button>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">このユーザーに表示される動画コースはありません。</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/35" onMouseDown={(event)=>{if(event.target===event.currentTarget)setSelectedCourseId(null)}}>
          <aside className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto bg-white shadow-2xl dark:bg-slate-950">
            <div className="sticky top-0 z-10 border-b bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-violet-600">動画コース進捗</p><h2 className="mt-1 text-lg font-semibold">{selectedCourse.title}</h2><p className="mt-1 text-sm text-slate-500">{selectedCourse.completedLessons}/{selectedCourse.totalLessons}レッスン完了（{selectedCourse.percent}%）</p></div><Button variant="ghost" size="sm" onClick={()=>setSelectedCourseId(null)}><X className="h-5 w-5"/></Button></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-violet-500" style={{width:`${selectedCourse.percent}%`}}/></div></div>
            <div className="space-y-5 p-5">{selectedCourse.modules.map((module)=><section key={module.moduleId}><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">{module.title}</h3><span className="text-xs text-slate-400">{module.lessons.filter((lesson)=>lesson.completed).length}/{module.lessons.length}</span></div><div className="divide-y overflow-hidden rounded-lg border dark:divide-slate-800 dark:border-slate-800">{module.lessons.map((lesson)=><div key={lesson.lessonId} className="flex items-center gap-3 px-3 py-2.5 text-sm">{lesson.completed?<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500"/>:<Circle className="h-4 w-4 shrink-0 text-slate-300"/>}<span className={lesson.completed?"font-medium":"text-slate-500"}>{lesson.title}</span><span className="ml-auto text-xs text-slate-400">{lesson.completed?"完了":"未完了"}</span></div>)}</div></section>)}</div>
          </aside>
        </div>
      )}

      {/* エッセイ詳細ダイアログ */}
      <Dialog open={!!selectedEssay} onOpenChange={(o) => !o && setSelectedEssay(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>提出内容と添削</DialogTitle></DialogHeader>
          {selectedEssay && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{selectedEssay.examType}</Badge>
                <Badge variant="outline">{selectedEssay.status ? STATUS_LABELS[selectedEssay.status] ?? selectedEssay.status : "提出済み"}</Badge>
                {selectedEssay.score != null && <span className="font-medium">スコア {selectedEssay.score}</span>}
                {selectedEssay.wordCount != null && <span className="text-slate-500">{selectedEssay.wordCount}語</span>}
                {selectedEssay.timeSpent != null && <span className="text-slate-500">{fmtMinutes(Math.round(selectedEssay.timeSpent / 60))}</span>}
                <span className="ml-auto text-slate-500">{fmtDateTime(selectedEssay.submittedAt)}</span>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium">提出内容</h4>
                <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-800">{selectedEssay.content}</div>
              </div>

              {selectedEssay.feedback && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">添削フィードバック</h4>
                  {selectedEssay.feedback.overall && <p className="rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/40">{selectedEssay.feedback.overall}</p>}

                  {selectedEssay.feedback.detailedScores && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Object.entries(selectedEssay.feedback.detailedScores).filter(([, v]) => v != null).map(([k, v]) => (
                        <div key={k} className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><span className="text-slate-500">{k}</span>: <span className="font-medium">{v}</span></div>
                      ))}
                    </div>
                  )}

                  {!!selectedEssay.feedback.strengths?.length && (
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">良い点</p>
                      <ul className="mt-1 space-y-1 rounded-md bg-green-50 p-3 text-sm dark:bg-green-950/40">{selectedEssay.feedback.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}

                  {!!selectedEssay.feedback.improvements?.length && (
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">改善点</p>
                      <ul className="mt-1 space-y-1 rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950/40">{selectedEssay.feedback.improvements.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                    </div>
                  )}

                  {!!selectedEssay.feedback.grammarCorrections?.corrections?.length && (
                    <div>
                      <p className="text-sm font-medium">文法・表現の添削</p>
                      <div className="mt-1 space-y-2">
                        {selectedEssay.feedback.grammarCorrections.corrections.map((c, i) => (
                          <div key={i} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
                            <p><span className="text-red-600 line-through">{c.original}</span> → <span className="text-green-700 dark:text-green-400">{c.corrected}</span></p>
                            <p className="mt-1 text-xs text-slate-500">{c.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, card }: { icon: typeof FileText; label: string; value: string; card?: boolean }) {
  const inner = (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
  if (card) return <Card><CardContent className="p-4">{inner}</CardContent></Card>;
  return inner;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3 text-center dark:border-slate-700"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
