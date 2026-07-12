"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Loader2, Mail, Plus, Target, Trash2, Trophy, UserRound } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useExam } from "@/contexts/ExamContext";
import { auth, db } from "@/lib/firebase";
import type { LearnerStatus, OnboardingProfile } from "@/lib/types";
import PrepShell from "@/components/prep/PrepShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Exam = OnboardingProfile["targetExam"];
type Form = { displayName:string; learnerStatus:LearnerStatus|""; learningReason:string; targetExam:Exam; targetScore:string; targetDate:string };
type ExamPlan = { id:string; exam:Exam; date:string; targetScore:string; note:string };
type ExamResult = { id:string; exam:Exam; date:string; score:string; note:string };
const EMPTY:Form={displayName:"",learnerStatus:"",learningReason:"",targetExam:"toefl",targetScore:"",targetDate:""};
const STATUS:{value:LearnerStatus;label:string}[]=[{value:"junior_high",label:"中学生"},{value:"high_school",label:"高校生"},{value:"university",label:"大学生・専門学校生"},{value:"working",label:"社会人"},{value:"other",label:"その他"}];
const EXAMS=[{value:"toefl",label:"TOEFL iBT"},{value:"ielts",label:"IELTS Academic"},{value:"toeic",label:"TOEIC"}] as const;
const newId=()=>`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function ExamSelect({value,onChange}:{value:Exam;onChange:(value:Exam)=>void}){
  return <select className="h-10 w-full rounded-md border bg-transparent px-3 dark:border-gray-700" value={value} onChange={e=>onChange(e.target.value as Exam)}>{EXAMS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>;
}

export default function ProfilePage(){
  const {user}=useAuth(); const {setExam}=useExam();
  const [form,setForm]=useState<Form>(EMPTY); const [plans,setPlans]=useState<ExamPlan[]>([]); const [results,setResults]=useState<ExamResult[]>([]);
  const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState<"idle"|"saving"|"saved"|"error">("idle"); const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{if(!user)return;getDoc(doc(db,"users",user.uid)).then(s=>{const d=s.data()||{},o=d.onboarding||{};setForm({displayName:d.displayName||user.displayName||"",learnerStatus:o.learnerStatus||"",learningReason:o.learningReason||"",targetExam:o.targetExam||"toefl",targetScore:o.targetScore!=null?String(o.targetScore):"",targetDate:o.targetDate||""});setPlans(Array.isArray(d.examPlans)?d.examPlans:[]);setResults(Array.isArray(d.examResults)?d.examResults:[]);setLoaded(true)}).catch(()=>{setForm({...EMPTY,displayName:user.displayName||""});setLoaded(true)})},[user]);
  useEffect(()=>{if(!loaded||!user)return;if(timer.current)clearTimeout(timer.current);setStatus("saving");timer.current=setTimeout(async()=>{try{const name=form.displayName.trim();const onboarding={learnerStatus:form.learnerStatus||null,learningReason:form.learningReason.trim(),targetExam:form.targetExam,targetScore:form.targetScore===""?null:Number(form.targetScore),targetDate:form.targetDate||null,updatedAt:new Date().toISOString()};await setDoc(doc(db,"users",user.uid),{displayName:name,onboarding,examPlans:plans,examResults:results,profileUpdatedAt:new Date().toISOString()},{merge:true});if(auth.currentUser&&auth.currentUser.displayName!==name)await updateProfile(auth.currentUser,{displayName:name});setExam(form.targetExam);setStatus("saved")}catch(e){console.error("Profile auto-save failed",e);setStatus("error")}},800);return()=>{if(timer.current)clearTimeout(timer.current)}},[form,plans,results,loaded,user]);

  function field<K extends keyof Form>(key:K,value:Form[K]){setForm(f=>({...f,[key]:value}))}
  function planField<K extends keyof ExamPlan>(id:string,key:K,value:ExamPlan[K]){setPlans(xs=>xs.map(x=>x.id===id?{...x,[key]:value}:x))}
  function resultField<K extends keyof ExamResult>(id:string,key:K,value:ExamResult[K]){setResults(xs=>xs.map(x=>x.id===id?{...x,[key]:value}:x))}
  if(!loaded)return <PrepShell><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-eg-dark"/></div></PrepShell>;

  return <PrepShell><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">プロフィール</h1><p className="mt-1 text-sm text-gray-500">学習目的、受験予定、スコアの記録をまとめて管理できます。</p></div><div className="text-sm">{status==="saving"?<span className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>自動保存中</span>:status==="saved"?<span className="flex items-center gap-2 text-emerald-600"><Check className="h-4 w-4"/>保存済み</span>:status==="error"?<span className="text-red-600">保存できませんでした</span>:null}</div></header>
  <div className="space-y-6">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-eg-dark"/>基本情報</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><Label>名前</Label><Input className="mt-2" value={form.displayName} onChange={e=>field("displayName",e.target.value)}/></div><div><Label>メールアドレス</Label><div className="relative mt-2"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/><Input className="pl-9" value={user?.email||""} disabled/></div></div><div className="sm:col-span-2"><Label>現在の学年・立場</Label><select className="mt-2 h-10 w-full rounded-md border bg-transparent px-3 dark:border-gray-700" value={form.learnerStatus} onChange={e=>field("learnerStatus",e.target.value as Form["learnerStatus"])}><option value="">選択してください</option>{STATUS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-eg-dark"/>学習目的と目標</CardTitle></CardHeader><CardContent className="space-y-5"><div><Label>英語を学ぶ理由</Label><Textarea className="mt-2 min-h-28" value={form.learningReason} onChange={e=>field("learningReason",e.target.value)}/></div><div className="grid gap-5 sm:grid-cols-3"><div><Label>対象試験</Label><div className="mt-2"><ExamSelect value={form.targetExam} onChange={v=>field("targetExam",v)}/></div></div><div><Label>目標スコア</Label><Input className="mt-2" type="number" step="0.5" value={form.targetScore} onChange={e=>field("targetScore",e.target.value)}/></div><div><Label>目標時期</Label><Input className="mt-2" type="month" value={form.targetDate} onChange={e=>field("targetDate",e.target.value)}/></div></div></CardContent></Card>
    <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-600"/>次回受験予定</CardTitle><Button size="sm" variant="outline" onClick={()=>setPlans(xs=>[...xs,{id:newId(),exam:form.targetExam,date:"",targetScore:form.targetScore,note:""}])}><Plus className="h-4 w-4"/>予定を追加</Button></div></CardHeader><CardContent className="space-y-4">{plans.length===0?<p className="rounded-xl border border-dashed py-8 text-center text-sm text-gray-400">受験予定はまだありません。</p>:plans.map(p=><div key={p.id} className="rounded-xl border p-4 dark:border-gray-700"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><div><Label>試験</Label><div className="mt-2"><ExamSelect value={p.exam} onChange={v=>planField(p.id,"exam",v)}/></div></div><div><Label>受験日</Label><Input className="mt-2" type="date" value={p.date} onChange={e=>planField(p.id,"date",e.target.value)}/></div><div><Label>目標スコア</Label><Input className="mt-2" type="number" step="0.5" value={p.targetScore} onChange={e=>planField(p.id,"targetScore",e.target.value)}/></div><Button aria-label="予定を削除" variant="ghost" size="icon" className="self-end text-red-500" onClick={()=>setPlans(xs=>xs.filter(x=>x.id!==p.id))}><Trash2 className="h-4 w-4"/></Button></div><div className="mt-4"><Label>メモ</Label><Input className="mt-2" value={p.note} onChange={e=>planField(p.id,"note",e.target.value)} placeholder="会場、申込期限、今回の目標など"/></div></div>)}</CardContent></Card>
    <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500"/>受験結果</CardTitle><Button size="sm" variant="outline" onClick={()=>setResults(xs=>[{id:newId(),exam:form.targetExam,date:"",score:"",note:""},...xs])}><Plus className="h-4 w-4"/>結果を追加</Button></div></CardHeader><CardContent className="space-y-4">{results.length===0?<p className="rounded-xl border border-dashed py-8 text-center text-sm text-gray-400">受験結果はまだありません。</p>:results.map(r=><div key={r.id} className="rounded-xl border p-4 dark:border-gray-700"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]"><div><Label>試験</Label><div className="mt-2"><ExamSelect value={r.exam} onChange={v=>resultField(r.id,"exam",v)}/></div></div><div><Label>受験日</Label><Input className="mt-2" type="date" value={r.date} onChange={e=>resultField(r.id,"date",e.target.value)}/></div><div><Label>取得スコア</Label><Input className="mt-2" type="number" step="0.5" value={r.score} onChange={e=>resultField(r.id,"score",e.target.value)}/></div><Button aria-label="結果を削除" variant="ghost" size="icon" className="self-end text-red-500" onClick={()=>setResults(xs=>xs.filter(x=>x.id!==r.id))}><Trash2 className="h-4 w-4"/></Button></div><div className="mt-4"><Label>振り返り・メモ</Label><Textarea className="mt-2 min-h-20" value={r.note} onChange={e=>resultField(r.id,"note",e.target.value)} placeholder="セクション別スコア、手応え、次回への改善点など"/></div></div>)}</CardContent></Card>
  </div><p className="mt-5 text-center text-xs text-gray-400">変更内容は入力を止めてから自動的に保存されます。</p></main></PrepShell>;
}
