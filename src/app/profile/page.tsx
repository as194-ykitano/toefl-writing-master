"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mail, Target, UserRound } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useExam } from "@/contexts/ExamContext";
import { auth, db } from "@/lib/firebase";
import type { LearnerStatus, OnboardingProfile } from "@/lib/types";
import PrepShell from "@/components/prep/PrepShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Form = { displayName:string; learnerStatus:LearnerStatus|""; learningReason:string; targetExam:OnboardingProfile["targetExam"]; targetScore:string; targetDate:string };
const EMPTY:Form={displayName:"",learnerStatus:"",learningReason:"",targetExam:"toefl",targetScore:"",targetDate:""};
const STATUS:{value:LearnerStatus;label:string}[]=[{value:"junior_high",label:"中学生"},{value:"high_school",label:"高校生"},{value:"university",label:"大学生・専門学校生"},{value:"working",label:"社会人"},{value:"other",label:"その他"}];

export default function ProfilePage(){
  const {user}=useAuth(); const {setExam}=useExam(); const [form,setForm]=useState<Form>(EMPTY); const [loaded,setLoaded]=useState(false); const [status,setStatus]=useState<"idle"|"saving"|"saved"|"error">("idle"); const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{if(!user)return;getDoc(doc(db,"users",user.uid)).then(s=>{const d=s.data()||{},o=d.onboarding||{};setForm({displayName:d.displayName||user.displayName||"",learnerStatus:o.learnerStatus||"",learningReason:o.learningReason||"",targetExam:o.targetExam||"toefl",targetScore:o.targetScore!=null?String(o.targetScore):"",targetDate:o.targetDate||""});setLoaded(true)}).catch(()=>{setForm({...EMPTY,displayName:user.displayName||""});setLoaded(true)})},[user]);
  useEffect(()=>{if(!loaded||!user)return;if(timer.current)clearTimeout(timer.current);setStatus("saving");timer.current=setTimeout(async()=>{try{const name=form.displayName.trim();const onboarding={learnerStatus:form.learnerStatus||null,learningReason:form.learningReason.trim(),targetExam:form.targetExam,targetScore:form.targetScore===""?null:Number(form.targetScore),targetDate:form.targetDate||null,updatedAt:new Date().toISOString()};await setDoc(doc(db,"users",user.uid),{displayName:name,onboarding},{merge:true});if(auth.currentUser&&auth.currentUser.displayName!==name)await updateProfile(auth.currentUser,{displayName:name});setExam(form.targetExam);setStatus("saved")}catch(e){console.error("Profile auto-save failed",e);setStatus("error")}},800);return()=>{if(timer.current)clearTimeout(timer.current)}},[form,loaded,user]);
  function field<K extends keyof Form>(key:K,value:Form[K]){setForm(f=>({...f,[key]:value}))}
  if(!loaded)return <PrepShell><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-eg-dark"/></div></PrepShell>;
  return <PrepShell><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">プロフィール</h1><p className="mt-1 text-sm text-gray-500">学習目的や目標を更新すると、学習画面にも反映されます。</p></div><div className="text-sm">{status==="saving"?<span className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>自動保存中</span>:status==="saved"?<span className="flex items-center gap-2 text-emerald-600"><Check className="h-4 w-4"/>保存済み</span>:status==="error"?<span className="text-red-600">保存できませんでした</span>:null}</div></header>
  <div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-eg-dark"/>基本情報</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="name">名前</Label><Input id="name" className="mt-2" value={form.displayName} onChange={e=>field("displayName",e.target.value)} placeholder="お名前"/></div><div><Label htmlFor="email">メールアドレス</Label><div className="relative mt-2"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/><Input id="email" className="pl-9" value={user?.email||""} disabled/></div></div><div className="sm:col-span-2"><Label htmlFor="status">現在の学年・立場</Label><select id="status" className="mt-2 h-10 w-full rounded-md border bg-transparent px-3 dark:border-gray-700" value={form.learnerStatus} onChange={e=>field("learnerStatus",e.target.value as Form["learnerStatus"])}><option value="">選択してください</option>{STATUS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div></CardContent></Card>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-eg-dark"/>学習目的と目標</CardTitle></CardHeader><CardContent className="space-y-5"><div><Label htmlFor="reason">英語を学ぶ理由</Label><Textarea id="reason" className="mt-2 min-h-28" value={form.learningReason} onChange={e=>field("learningReason",e.target.value)} placeholder="留学、仕事、試験対策など"/></div><div className="grid gap-5 sm:grid-cols-3"><div><Label htmlFor="exam">対象試験</Label><select id="exam" className="mt-2 h-10 w-full rounded-md border bg-transparent px-3 dark:border-gray-700" value={form.targetExam} onChange={e=>field("targetExam",e.target.value as Form["targetExam"])}><option value="toefl">TOEFL iBT</option><option value="ielts">IELTS Academic</option><option value="toeic">TOEIC</option></select></div><div><Label htmlFor="score">目標スコア</Label><Input id="score" className="mt-2" type="number" step="0.5" value={form.targetScore} onChange={e=>field("targetScore",e.target.value)}/></div><div><Label htmlFor="date">目標時期</Label><Input id="date" className="mt-2" type="month" value={form.targetDate} onChange={e=>field("targetDate",e.target.value)}/></div></div></CardContent></Card></div>
  <p className="mt-5 text-center text-xs text-gray-400">変更内容は入力を止めてから自動的に保存されます。</p></main></PrepShell>;
}
