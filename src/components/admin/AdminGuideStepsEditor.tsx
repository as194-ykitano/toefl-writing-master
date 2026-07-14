"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { GuideManualStep } from "@/lib/guide-manual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  steps: GuideManualStep[];
  onChange: (steps: GuideManualStep[]) => void;
  storagePrefix: string;
};

function newStep(): GuideManualStep {
  return {
    key: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "新しい手順",
    description: "",
  };
}

export function AdminGuideStepsEditor({ steps, onChange, storagePrefix }: Props) {
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  function update(index: number, patch: Partial<GuideManualStep>) {
    onChange(steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  async function upload(index: number, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("画像またはGIFファイルを選択してください。");
      return;
    }
    const step = steps[index];
    try {
      setUploadingKey(step.key);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const objectRef = ref(storage, `${storagePrefix}/${Date.now()}-${safeName}`);
      const url = await getDownloadURL((await uploadBytes(objectRef, file)).ref);
      update(index, {
        src: url,
        mediaType: file.type === "image/gif" || /\.gif$/i.test(file.name) ? "gif" : "image",
        comingSoon: false,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "画像・GIFのアップロードに失敗しました。");
    } finally {
      setUploadingKey(null);
      const input = fileInputs.current[step.key];
      if (input) input.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">操作手順（{steps.length}件）</p>
          <p className="mt-1 text-sm text-slate-500">この並び順で、タイトル・説明・画像またはGIFがユーザー画面に表示されます。</p>
        </div>
        <Button type="button" variant="outline" onClick={() => onChange([...steps, newStep()])}>
          <Plus className="h-4 w-4" />手順を追加
        </Button>
      </div>

      {steps.map((step, index) => (
        <section key={step.key} className="overflow-hidden rounded-xl border dark:border-slate-700">
          <header className="flex items-center gap-3 border-b bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-bold text-white">{index + 1}</span>
            <p className="min-w-0 flex-1 truncate font-semibold">{step.title || "タイトル未入力"}</p>
            <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)} aria-label="ひとつ上へ移動"><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={index === steps.length - 1} onClick={() => move(index, 1)} aria-label="ひとつ下へ移動"><ArrowDown className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => { if (confirm(`手順${index + 1}を削除しますか？`)) onChange(steps.filter((_, stepIndex) => stepIndex !== index)); }} aria-label="手順を削除"><Trash2 className="h-4 w-4" /></Button>
          </header>

          <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:p-6">
            <div className="space-y-4">
              <div><Label htmlFor={`step-title-${step.key}`}>ステップタイトル</Label><Input id={`step-title-${step.key}`} className="mt-1" value={step.title} onChange={(event) => update(index, { title: event.target.value })} /></div>
              <div><Label htmlFor={`step-description-${step.key}`}>説明テキスト</Label><Textarea id={`step-description-${step.key}`} className="mt-1 min-h-28" value={step.description} onChange={(event) => update(index, { description: event.target.value })} /></div>
              <div><Label htmlFor={`step-details-${step.key}`}>確認ポイント（1行に1項目・任意）</Label><Textarea id={`step-details-${step.key}`} className="mt-1 min-h-24" value={step.details?.join("\n") ?? ""} onChange={(event) => update(index, { details: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) })} /></div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 dark:border-slate-700"><div><p className="text-sm font-medium">Coming Soon 表示</p><p className="text-xs text-slate-500">ONの場合、メディアの代わりに準備中表示を出します。</p></div><Switch checked={step.comingSoon === true} onCheckedChange={(comingSoon) => update(index, { comingSoon })} /></div>
            </div>

            <div className="space-y-4">
              <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40">
                {step.comingSoon ? <p className="font-bold text-orange-600">Coming Soon</p> : step.src ? <img src={step.src} alt={`${step.title}のプレビュー`} className="max-h-96 w-full object-contain" /> : <p className="text-sm text-slate-400">画像・GIFは未設定です</p>}
              </div>
              <div><Label htmlFor={`step-src-${step.key}`}>画像・GIF URL</Label><Input id={`step-src-${step.key}`} className="mt-1" value={step.src ?? ""} placeholder="/guide-gifs/... または https://..." onChange={(event) => update(index, { src: event.target.value, mediaType: /\.gif(?:\?|$)/i.test(event.target.value) ? "gif" : "image" })} /></div>
              <div className="flex flex-wrap gap-2">
                <input ref={(element) => { fileInputs.current[step.key] = element; }} type="file" accept="image/*,.gif" className="hidden" onChange={(event) => upload(index, event.target.files?.[0])} />
                <Button type="button" variant="outline" disabled={uploadingKey === step.key} onClick={() => fileInputs.current[step.key]?.click()}>{uploadingKey === step.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{step.src ? "画像・GIFを差し替え" : "画像・GIFを追加"}</Button>
                {step.src ? <Button type="button" variant="ghost" className="text-red-600" onClick={() => update(index, { src: undefined, mediaType: undefined })}>メディアを外す</Button> : null}
              </div>
              <p className="text-xs text-slate-500">アップロード後にページ上部の「保存」を押すと、ガイドへ反映されます。</p>
            </div>
          </div>
        </section>
      ))}

      {steps.length === 0 ? <div className="rounded-xl border border-dashed py-12 text-center text-sm text-slate-500">操作手順がありません。「手順を追加」から作成できます。</div> : null}
    </div>
  );
}
