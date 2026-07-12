"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { EXAM_SKILLS, ExamId } from "@/lib/prep/types";
import { getPracticeTypes } from "@/lib/prep/question-types";
import { FeatureAvailability, mergeFeatureAvailability, practiceTypeFeatureKey } from "@/lib/prep/feature-availability";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COURSES = [
  { id: "toefl", label: "TOEFL" }, { id: "ielts", label: "IELTS" },
  { id: "toeic", label: "TOEIC" }, { id: "advanced", label: "Advanced" },
  { id: "mock", label: "Mock Test" },
];

function Toggle({checked,onChange}:{checked:boolean;onChange:()=>void}) {
  return <button type="button" onClick={onChange} aria-pressed={!checked} aria-label={checked?"非公開":"公開中"} className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${checked?"bg-slate-400 dark:bg-slate-600":"bg-emerald-500"}`}><span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked?"translate-x-1":"translate-x-6"}`}/></button>;
}

export default function AvailabilityAdminPage(){
  const [value,setValue]=useState<FeatureAvailability|null>(null); const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const call=useCallback(async(init?:RequestInit)=>{if(!auth.currentUser)throw new Error("認証が必要です。");const token=await auth.currentUser.getIdToken();const r=await fetch("/api/admin/feature-availability",{...init,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error("設定の取得・保存に失敗しました。");return r.json()},[]);
  useEffect(()=>{call().then(v=>setValue(mergeFeatureAvailability(v))).catch(e=>alert(e.message))},[call]);
  const typeGroups=useMemo(()=>Object.entries(EXAM_SKILLS).flatMap(([exam,skills])=>skills.map(skill=>({exam:exam as ExamId,skill,types:getPracticeTypes(exam as ExamId,skill)}))).filter(g=>g.types.length),[]);
  async function update(next:FeatureAvailability){setValue(next);setSaving(true);setSaved(false);try{setValue(mergeFeatureAvailability(await call({method:"PUT",body:JSON.stringify(next)})));setSaved(true);setTimeout(()=>setSaved(false),1600)}catch(e){alert(e instanceof Error?e.message:"保存失敗")}finally{setSaving(false)}}
  if(!value)return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin"/></div>;
  return <main className="mx-auto max-w-6xl space-y-7 p-6 md:p-8"><header className="flex items-end justify-between"><div><h1 className="text-2xl font-bold">公開設定</h1><p className="mt-1 text-sm text-slate-500">コースと問題タイプの公開状態を管理します。</p></div><div className="text-sm text-slate-500">{saving?<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>保存中</span>:saved?<span className="flex items-center gap-2 text-emerald-600"><Check className="h-4 w-4"/>保存済み</span>:"変更時に自動保存"}</div></header>
  <Card><CardHeader><CardTitle>コース・機能</CardTitle></CardHeader><CardContent className="divide-y dark:divide-slate-700">{COURSES.map(c=><div key={c.id} className="flex items-center justify-between py-4"><div><p className="font-medium">{c.label}</p><p className={`text-xs ${value.courses[c.id]?"text-slate-500":"text-emerald-600"}`}>{value.courses[c.id]?"非公開":"公開中"}</p></div><Toggle checked={value.courses[c.id]===true} onChange={()=>update({...value,courses:{...value.courses,[c.id]:!value.courses[c.id]}})}/></div>)}</CardContent></Card>
  {typeGroups.map(g=><Card key={`${g.exam}-${g.skill}`}><CardHeader><CardTitle>{g.exam.toUpperCase()} / {g.skill[0].toUpperCase()+g.skill.slice(1)}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{g.types.map(t=>{const key=practiceTypeFeatureKey(g.exam,g.skill,t.id);const coming=value.practiceTypes[key]??t.comingSoon??false;return <div key={key} className="flex items-center justify-between rounded-xl border p-4 dark:border-slate-700"><div className="pr-3"><p className="text-sm font-medium">{t.label}</p><p className="text-xs text-slate-500">{t.labelJa}</p><p className={`mt-1 flex items-center gap-1 text-xs ${coming?"text-slate-500":"text-emerald-600"}`}>{coming&&<Clock className="h-3 w-3"/>}{coming?"非公開":"公開中"}</p></div><Toggle checked={coming} onChange={()=>update({...value,practiceTypes:{...value.practiceTypes,[key]:!coming}})}/></div>})}</CardContent></Card>)}</main>;
}
