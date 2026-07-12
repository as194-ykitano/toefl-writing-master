"use client";

// ホーム（マイコース）
// 画面左上の試験切替に連動し、選択中の試験の Home を表示する。
// 横長の技能バー（Reading / Listening / Speaking / Writing）を押すと、
// その下にその技能の問題タイプがずらっと並ぶ（画像2枚目のイメージ）。

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Headphones,
  ListChecks,
  Mic,
  PenLine,
  Target,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useExam } from "@/contexts/ExamContext";
import PrepShell from "@/components/prep/PrepShell";
import OnboardingTour, { hasSeenTour } from "@/components/prep/OnboardingTour";
import { getSkillStats } from "@/lib/prep/data-source";
import { useCompletedCounts } from "@/lib/prep/use-completion";
import { getPracticeTypes, PracticeTypeInfo } from "@/lib/prep/question-types";
import { EXAM_LABELS, EXAM_SKILLS, ExamId, SkillId } from "@/lib/prep/types";
import { practiceTypeFeatureKey } from "@/lib/prep/feature-availability";
import { useFeatureAvailability } from "@/lib/prep/use-feature-availability";
import { db } from "@/lib/firebase";

interface SkillTab {
  skill: SkillId;
  title: string;
  description: string;
  icon: typeof BookOpen;
  /** ライトモードのアクティブ塗り（グラデーション） */
  accent: string;
  /** ダークモードのアクティブ時：ベタ塗りをやめ、外枠を色で縁取り + 落ち着いた色にする */
  darkBorder: string;
  darkTint: string;
  darkTitle: string;
  darkDesc: string;
  darkIcon: string;
}

const SKILL_TABS: SkillTab[] = [
  {
    skill: "reading", title: "Reading", description: "問題タイプ別に読解を演習", icon: BookOpen,
    accent: "from-blue-500 to-blue-600",
    darkBorder: "dark:border-blue-500/70", darkTint: "dark:bg-blue-500/10",
    darkTitle: "dark:text-blue-200", darkDesc: "dark:text-blue-200/70", darkIcon: "dark:text-blue-400",
  },
  {
    skill: "listening", title: "Listening", description: "音声を聞いて設問に回答", icon: Headphones,
    accent: "from-violet-500 to-violet-600",
    darkBorder: "dark:border-violet-500/70", darkTint: "dark:bg-violet-500/10",
    darkTitle: "dark:text-violet-200", darkDesc: "dark:text-violet-200/70", darkIcon: "dark:text-violet-400",
  },
  {
    skill: "speaking", title: "Speaking", description: "準備 → 録音 → AI 添削", icon: Mic,
    accent: "from-orange-500 to-orange-600",
    darkBorder: "dark:border-orange-500/70", darkTint: "dark:bg-orange-500/10",
    darkTitle: "dark:text-orange-200", darkDesc: "dark:text-orange-200/70", darkIcon: "dark:text-orange-400",
  },
  {
    skill: "writing", title: "Writing", description: "AI 添削つきで英作文", icon: PenLine,
    accent: "from-emerald-500 to-emerald-600",
    darkBorder: "dark:border-emerald-500/70", darkTint: "dark:bg-emerald-500/10",
    darkTitle: "dark:text-emerald-200", darkDesc: "dark:text-emerald-200/70", darkIcon: "dark:text-emerald-400",
  },
];

function TypeCard({
  type,
  exam,
  skill,
  setCount,
  completedCount,
  forceComingSoon,
}: {
  type: PracticeTypeInfo;
  exam: ExamId;
  skill: SkillId;
  setCount: number;
  completedCount: number;
  forceComingSoon?: boolean;
}) {
  const disabled = (forceComingSoon ?? type.comingSoon ?? false) || (!type.href && setCount === 0);
  const href = type.href ?? `/practice/${exam}/${skill}?type=${type.id}`;
  const allDone = setCount > 0 && completedCount >= setCount;
  const iconColor:Record<SkillId,string>={reading:"bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",listening:"bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",speaking:"bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",writing:"bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"};

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor[skill]}`}>
          <ListChecks className="w-4.5 h-4.5" />
        </div>
        {disabled ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1 dark:bg-gray-800 dark:text-gray-500">
            <Clock className="w-3 h-3" /> 準備中
          </span>
        ) : setCount > 0 ? (
          <span
            className={`text-[10px] font-medium rounded-full px-2 py-1 ${
              allDone
                ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
                : "text-gray-400 bg-gray-50 dark:text-gray-500 dark:bg-gray-800"
            }`}
          >
            {completedCount}/{setCount} 解答済み
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 font-semibold text-gray-900 dark:text-gray-100 text-sm">{type.label}</div>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{type.labelJa}</p>
      {type.description && (
        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed flex-1">{type.description}</p>
      )}
      {!disabled && (
        <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-eg-deep group-hover:gap-1.5 transition-all">
          開く <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </>
  );

  const cardClass = `group bg-white rounded-xl border p-4 flex flex-col transition-all dark:bg-gray-900/60 ${
    disabled
      ? "border-gray-100 opacity-70 dark:border-gray-800"
      : "border-gray-200/70 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 dark:border-gray-700 dark:hover:border-gray-600"
  }`;

  if (disabled) return <div className={cardClass}>{inner}</div>;
  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

// 初回ログイン時の使い方ツアーの起動制御。
// - 初回（未既読）は自動表示
// - 使い方ガイドからの再表示は ?tour=1 で起動
function HomeTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const forced = searchParams.get("tour") === "1";
    if (forced) {
      setOpen(true);
      // URL をきれいに戻す（履歴を汚さない）
      router.replace("/home");
      return;
    }
    if (!hasSeenTour()) {
      // レイアウト確定後に開始
      const t = window.setTimeout(() => setOpen(true), 400);
      return () => window.clearTimeout(t);
    }
  }, [searchParams, router]);

  return <OnboardingTour open={open} onClose={() => setOpen(false)} />;
}

export default function HomePage() {
  const { user } = useAuth();
  const { exam } = useExam();
  const availability = useFeatureAvailability();
  const router = useRouter();
  const name = user?.displayName;
  const activeExam: ExamId = exam === "advanced" ? "toefl" : exam;
  const [profileGoals,setProfileGoals]=useState<{targetScore:string;nextExam:{exam:ExamId;date:string;targetScore:string}|null}>({targetScore:"",nextExam:null});

  useEffect(()=>{if(!user)return;let active=true;getDoc(doc(db,"users",user.uid)).then(s=>{if(!active)return;const d=s.data()||{},o=d.onboarding||{},plans=Array.isArray(d.examPlans)?d.examPlans:[];const dated=plans.filter((p:{date?:string})=>p.date).sort((a:{date:string},b:{date:string})=>a.date.localeCompare(b.date));const next=(dated.find((p:{date:string})=>p.date>=new Date().toISOString().slice(0,10))||plans.find((p:{date?:string})=>!p.date)||null) as {exam:ExamId;date:string;targetScore:string}|null;setProfileGoals({targetScore:o.targetScore!=null?String(o.targetScore):"",nextExam:next})}).catch(()=>undefined);return()=>{active=false}},[user]);

  // その試験で対応している技能タブのみ表示（TOEIC は Reading + Listening）
  const visibleTabs = useMemo(
    () => SKILL_TABS.filter((t) => EXAM_SKILLS[activeExam].includes(t.skill)),
    [activeExam]
  );

  // Advanced 選択時はホームではなく Advanced ハブを表示する
  useEffect(() => {
    if (exam === "advanced") router.replace("/advanced");
  }, [exam, router]);

  const [skill, setSkill] = useState<SkillId>("reading");
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [skillQuestionCounts,setSkillQuestionCounts]=useState<Partial<Record<SkillId,number>>>({});

  // 試験を切り替えたとき、選択中の技能がその試験に無ければ先頭の技能へ戻す
  useEffect(() => {
    if (!EXAM_SKILLS[activeExam].includes(skill)) {
      setSkill(EXAM_SKILLS[activeExam][0]);
    }
  }, [activeExam, skill]);

  useEffect(() => {
    let cancelled = false;
    getSkillStats(activeExam, skill).then((s) => {
      if (cancelled) return;
      setTypeCounts(s.typeCounts);
    });
    return () => {
      cancelled = true;
    };
  }, [activeExam, skill]);

  useEffect(()=>{let cancelled=false;Promise.all(EXAM_SKILLS[activeExam].map(async current=>[current,(await getSkillStats(activeExam,current)).questionCount] as const)).then(entries=>{if(!cancelled)setSkillQuestionCounts(Object.fromEntries(entries))});return()=>{cancelled=true}},[activeExam]);

  const completedCounts = useCompletedCounts(activeExam, skill);
  const types = useMemo(() => getPracticeTypes(activeExam, skill), [activeExam, skill]);
  const daysUntilExam=profileGoals.nextExam?.date?Math.ceil((new Date(`${profileGoals.nextExam.date}T00:00:00`).getTime()-new Date(new Date().toDateString()).getTime())/86400000):null;
  const countdownLabel=daysUntilExam===null?"未定":daysUntilExam===0?"今日":daysUntilExam>0?`あと ${daysUntilExam} 日`:"受験日経過";

  if (availability.courses[activeExam]) {
    return <PrepShell><div className="mx-auto max-w-3xl px-4 py-20 text-center"><div className="rounded-2xl border bg-white px-6 py-16 dark:border-gray-800 dark:bg-gray-900"><Clock className="mx-auto h-10 w-10 text-gray-400"/><h1 className="mt-5 text-2xl font-bold">{EXAM_LABELS[activeExam]}</h1><p className="mt-2 text-gray-500">このコースは現在準備中です。別のコースを選択してください。</p><span className="mt-5 inline-block rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Coming Soon</span></div></div></PrepShell>;
  }

  return (
    <PrepShell>
      <Suspense fallback={null}>
        <HomeTour />
      </Suspense>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(500px,1.2fr)] lg:items-stretch">
          <div className="flex flex-col justify-center animate-in fade-in slide-in-from-bottom-3 duration-700"><h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 sm:text-2xl">{name?`こんにちは、${name} さん`:"こんにちは"}</h1></div>
          <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
            <Link href="/profile" style={{animationDelay:"100ms"}} className="group flex min-h-32 flex-col justify-between rounded-xl border border-gray-200/70 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-gray-600 animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"><div className="flex items-center justify-between"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Target className="h-4.5 w-4.5"/></div><ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5"/></div><div><p className="text-xs text-gray-400">目標スコア</p><p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{profileGoals.targetScore||"未定"}</p></div></Link>
            <Link href="/profile" style={{animationDelay:"180ms"}} className="group flex min-h-32 flex-col justify-between rounded-xl border border-gray-200/70 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-gray-600 animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both"><div className="flex items-center justify-between"><p className="flex items-center gap-2 text-xs text-gray-400"><CalendarDays className="h-4 w-4 text-amber-500"/>次回受験まで</p><ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5"/></div><div><p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">{countdownLabel}</p><p className="mt-1 text-xs text-gray-500">{profileGoals.nextExam?<>{EXAM_LABELS[profileGoals.nextExam.exam]||profileGoals.nextExam.exam.toUpperCase()} ・ {profileGoals.nextExam.date?profileGoals.nextExam.date.replace(/-/g,"/"):"日付未定"}{profileGoals.nextExam.targetScore?` ・ 目標 ${profileGoals.nextExam.targetScore}`:""}</>:"試験・日付・目標はプロフィールで登録"}</p></div></Link>
          </div>
        </div>

        {/* 横長の技能バー（押すと下にその技能の問題タイプが並ぶ） */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5" data-tour="skills">
          {visibleTabs.map((tab, i) => {
            const active = tab.skill === skill;
            const Icon = tab.icon;
            return (
              <button
                key={tab.skill}
                onClick={() => setSkill(tab.skill)}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both ${
                  active
                    ? `border-transparent text-white shadow-md ${tab.darkBorder} ${tab.darkTint} dark:shadow-none`
                    : "border-gray-200/70 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-gray-600"
                }`}
              >
                {active && (
                  // ライトはベタ塗りのグラデーション。ダークでは塗らず外枠の色で表現する
                  <span
                    className={`absolute inset-0 bg-gradient-to-br dark:hidden ${tab.accent}`}
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon
                    className={`w-5 h-5 ${active ? `text-white ${tab.darkIcon}` : "text-gray-400"}`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      active ? `text-white ${tab.darkTitle}` : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {tab.title}
                  </span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${active?"bg-white/20 text-white dark:bg-white/10":"bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>{skillQuestionCounts[tab.skill]??0} 問</span>
                </span>
                <span
                  className={`relative mt-1.5 block text-[11px] leading-snug ${
                    active ? `text-white/85 ${tab.darkDesc}` : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>

        {types.length === 0 ? (
          <div data-tour="types" className="mt-6 rounded-xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500">
            この技能の問題タイプは準備中です
          </div>
        ) : (
          <div key={skill} data-tour="types" className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {types.map((type, i) => (
              <div
                key={type.id}
                style={{ animationDelay: `${i * 45}ms` }}
                className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
              >
                <TypeCard
                  type={type}
                  exam={activeExam}
                  skill={skill}
                  setCount={typeCounts[type.id] ?? 0}
                  completedCount={completedCounts[type.id] ?? 0}
                  forceComingSoon={availability.practiceTypes[practiceTypeFeatureKey(activeExam,skill,type.id)]}
                />
              </div>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-[11px] text-gray-400 dark:text-gray-500">
          Prep Master — Supported by <span className="font-semibold text-eg-dark dark:text-eg">English Gym</span>
        </p>
      </div>
    </PrepShell>
  );
}
