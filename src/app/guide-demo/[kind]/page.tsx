"use client";

import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Lightbulb, Mic, Send, Sparkles, Volume2 } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";

const writingSample = `I believe universities should provide more flexible study spaces for students. A quiet library is important, but collaborative rooms are equally valuable because many assignments require discussion and teamwork. For example, students can compare ideas, explain difficult concepts to one another, and prepare presentations more efficiently. Therefore, universities should maintain both silent areas and reservable group spaces.`;

const speakingSample = "I prefer studying in the morning because I can concentrate before my day becomes busy. For example, I usually review vocabulary and plan my assignments after breakfast. This routine helps me start the day with a clear goal.";

function DemoBadge() {
  return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">マニュアル用デモデータ</span>;
}

function WritingInput({ exam }: { exam: string }) {
  return <DemoFrame title={`${exam} Writing：解答を入力する`}><div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><section className="rounded-2xl border bg-slate-50 p-5"><h2 className="font-bold">問題</h2><p className="mt-3 text-sm leading-7 text-slate-600">大学は、静かな自習スペースとグループ学習スペースのどちらを優先すべきですか。理由と具体例を含めて答えてください。</p></section><section className="rounded-2xl border bg-white p-5 shadow-sm"><label className="text-sm font-bold">あなたの解答</label><textarea readOnly value={writingSample} data-guide-target="sample-answer" className="mt-3 h-56 w-full resize-none rounded-xl border-2 border-orange-400 bg-white p-4 text-sm leading-6 outline-none"/><div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">58 words</span><button data-guide-target="submit" className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow"><Send className="h-4 w-4"/>提出して添削を受ける</button></div></section></div></DemoFrame>;
}

function WritingFeedback({ exam }: { exam: string }) {
  return <DemoFrame title={`${exam} Writing：フィードバックを見る`}><div data-guide-target="score" className="rounded-2xl bg-slate-900 p-6 text-white"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs text-slate-300">総合評価</p><p className="mt-1 text-3xl font-black">{exam === "IELTS" ? "Band 6.5" : "4.0 / 5.0"}</p></div><div className="grid grid-cols-2 gap-3 text-sm"><span className="rounded-lg bg-white/10 px-4 py-2">内容 4.0</span><span className="rounded-lg bg-white/10 px-4 py-2">構成 3.5</span><span className="rounded-lg bg-white/10 px-4 py-2">語彙 4.0</span><span className="rounded-lg bg-white/10 px-4 py-2">文法 3.5</span></div></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><FeedbackCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500"/>} title="良かった点" items={["主張が最初の文で明確です。","具体例が主張を効果的に支えています。"]}/><FeedbackCard icon={<Lightbulb className="h-5 w-5 text-orange-500"/>} title="改善ポイント" items={["結論で主要な理由を短く言い換えましょう。","接続表現の種類を増やすと流れが自然になります。"]}/></div><section data-guide-target="model-answer" className="mt-5 rounded-2xl border-2 border-orange-400 bg-orange-50 p-5"><div className="flex items-center gap-2 font-bold"><Sparkles className="h-5 w-5 text-orange-500"/>改善版・モデル回答</div><p className="mt-3 text-sm leading-7 text-slate-700">{writingSample}</p></section></DemoFrame>;
}

function SpeakingInput({ exam }: { exam: string }) {
  return <DemoFrame title={`${exam} Speaking：録音を確認する`}><section className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-orange-100"><Mic className="h-5 w-5 text-orange-600"/></span><div><h2 className="font-bold">録音済みの回答</h2><p className="text-sm text-slate-500">再生してから提出できます</p></div></div><div data-guide-target="recording" className="mt-5 rounded-2xl border-2 border-orange-400 bg-slate-50 p-5"><div className="flex h-16 items-center justify-center gap-1">{[18,30,46,28,55,38,62,35,48,24,42,58,32,44,20,36,52,29,40,23].map((height,index)=><span key={index} className="w-2 rounded-full bg-orange-400" style={{height}}/>)}</div><audio controls className="mt-4 w-full" src="/guide-demo/sample-speaking.wav"/></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">サンプル回答</p><p className="mt-2 text-sm leading-7 text-slate-700">{speakingSample}</p></div><div className="mt-5 flex justify-end"><button data-guide-target="submit" className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow"><Send className="h-4 w-4"/>録音を提出する</button></div></section></DemoFrame>;
}

function SpeakingFeedback({ exam }: { exam: string }) {
  return <DemoFrame title={`${exam} Speaking：フィードバックを見る`}><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><section data-guide-target="score" className="rounded-2xl bg-slate-900 p-6 text-white"><p className="text-xs text-slate-300">推定スコア</p><p className="mt-2 text-4xl font-black">{exam === "IELTS" ? "Band 6.5" : "3.5 / 4.0"}</p><div className="mt-6 space-y-3 text-sm"><Metric label="発話速度" value="128 WPM"/><Metric label="無音割合" value="12%"/><Metric label="長いポーズ" value="1回"/></div></section><section className="space-y-4"><div data-guide-target="transcript" className="rounded-2xl border-2 border-orange-400 bg-orange-50 p-5"><div className="flex items-center gap-2 font-bold"><Volume2 className="h-5 w-5 text-orange-500"/>文字起こし</div><p className="mt-3 text-sm leading-7 text-slate-700">{speakingSample}</p></div><div className="grid gap-4 md:grid-cols-2"><FeedbackCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500"/>} title="良かった点" items={["理由と具体例が明確です。","聞き取りやすい速度で話せています。"]}/><FeedbackCard icon={<Lightbulb className="h-5 w-5 text-orange-500"/>} title="改善ポイント" items={["結論を一文加えると完成度が上がります。","同じ語の繰り返しを言い換えましょう。"]}/></div></section></div></DemoFrame>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="flex justify-between border-b border-white/10 pb-2"><span className="text-slate-300">{label}</span><strong>{value}</strong></div>; }
function FeedbackCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) { return <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-bold">{icon}{title}</div><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{items.map(item=><li key={item}>・{item}</li>)}</ul></section>; }
function DemoFrame({ title, children }: { title: string; children: React.ReactNode }) { return <PrepShell><main className="mx-auto max-w-6xl px-5 py-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">実際の学習記録には保存されません</p></div><DemoBadge/></div>{children}</main></PrepShell>; }

export default function GuideDemoPage() {
  const kind = String(useParams<{ kind: string }>().kind);
  const params = useSearchParams();
  const exam = params.get("exam") === "ielts" ? "IELTS" : "TOEFL";
  const stage = params.get("stage") === "feedback" ? "feedback" : "input";
  if (kind === "writing") return stage === "feedback" ? <WritingFeedback exam={exam}/> : <WritingInput exam={exam}/>;
  return stage === "feedback" ? <SpeakingFeedback exam={exam}/> : <SpeakingInput exam={exam}/>;
}
