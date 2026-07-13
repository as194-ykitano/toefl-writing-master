"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Award, BookOpen, CalendarClock, Clock, FileText, GraduationCap,
  KeyRound, Mail, Target, Timer, TrendingUp,
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
interface DetailResponse { user: DetailUser; essays: DetailEssay[]; stats: DetailStats }

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
  { key: "exam", label: "受験情報", icon: Target },
  { key: "study", label: "学習管理", icon: BookOpen },
  { key: "essays", label: "添削・提出物", icon: FileText },
  { key: "activity", label: "アクティビティ", icon: TrendingUp },
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

export default function UserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("exam");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [savingPerm, setSavingPerm] = useState(false);
  const [selectedEssay, setSelectedEssay] = useState<DetailEssay | null>(null);

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
            <Stat icon={FileText} label="提出数" value={String(stats.totalEssays)} />
            <Stat icon={Award} label="平均スコア" value={stats.averageScore != null ? String(stats.averageScore) : "—"} />
            <Stat icon={Clock} label="総学習時間" value={fmtMinutes(user.totalStudyTime)} />
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
            <Stat card icon={Clock} label="総学習時間" value={fmtMinutes(user.totalStudyTime)} />
            <Stat card icon={TrendingUp} label="現在スコア" value={user.progress?.currentScore != null ? String(user.progress.currentScore) : "—"} />
            <Stat card icon={CalendarClock} label="最終提出" value={fmtDate(user.progress?.lastSubmission ?? stats.lastSubmission)} />
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
        <Card>
          <CardHeader><CardTitle className="text-base">提出物と添削（{data.essays.length}件）</CardTitle></CardHeader>
          <CardContent>
            {data.essays.length ? (
              <div className="space-y-3">
                {data.essays.map((essay) => (
                  <button
                    key={`${essay.collection}-${essay.id}`}
                    onClick={() => setSelectedEssay(essay)}
                    className="w-full rounded-lg border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{essay.examType}</Badge>
                      <Badge variant="outline">{essay.status ? STATUS_LABELS[essay.status] ?? essay.status : "提出済み"}</Badge>
                      {essay.score != null && <span className="text-sm font-medium">スコア {essay.score}</span>}
                      {essay.wordCount != null && <span className="text-xs text-slate-500">{essay.wordCount}語</span>}
                      <span className="ml-auto text-xs text-slate-500">{fmtDate(essay.submittedAt)}</span>
                    </div>
                    {essay.videoTitle && <p className="mt-1 text-xs text-slate-500">{essay.videoTitle}</p>}
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{essay.content?.slice(0, 200)}</p>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">提出物はありません。</p>}
          </CardContent>
        </Card>
      )}

      {/* アクティビティ */}
      {tab === "activity" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat card icon={FileText} label="総提出数" value={String(stats.totalEssays)} />
            <Stat card icon={Award} label="フィードバック完了" value={String(stats.feedbackCompleted)} />
            <Stat card icon={TrendingUp} label="平均スコア" value={stats.averageScore != null ? String(stats.averageScore) : "—"} />
            <Stat card icon={BookOpen} label="総語数" value={stats.totalWords.toLocaleString()} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">試験タイプ別の提出数</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.byExamType).length ? (
                Object.entries(stats.byExamType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                  const pct = stats.totalEssays ? Math.round((count / stats.totalEssays) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="mb-1 flex justify-between text-sm"><span>{type}</span><span className="text-slate-500">{count}件</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })
              ) : <p className="text-sm text-slate-500">提出データがありません。</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stat card icon={CalendarClock} label="登録日" value={fmtDate(user.createdAt)} />
            <Stat card icon={CalendarClock} label="最終提出日" value={fmtDate(stats.lastSubmission)} />
          </div>
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
