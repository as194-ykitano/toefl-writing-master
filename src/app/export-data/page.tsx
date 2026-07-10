"use client";

// 旧仕様データ（Firestore）エクスポート用ユーティリティページ（一時的な管理用）
//
// Firestore のセキュリティルール上、tasks / readingPassages は「ログイン済みユーザー」
// のみ読み取り可能。このページはログイン済みの状態で開くだけで、
// 旧 Writing 問題（tasks）と Reading パッセージ（readingPassages）を 1 つの JSON に
// まとめてダウンロードできる。ダウンロードした JSON を開発者へ渡すと新仕様へ移行できる。
//
// ※ 移行完了後はこのページを削除して構わない。

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PrepShell from "@/components/prep/PrepShell";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// Firestore Timestamp を ISO 文字列へ（JSON で扱いやすくする）
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof (v as { toDate?: unknown }).toDate === "function") {
      try {
        return (v as { toDate: () => Date }).toDate().toISOString();
      } catch {
        return null;
      }
    }
    if (Array.isArray(value)) return value.map(serialize);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = serialize(val);
    return out;
  }
  return value;
}

async function fetchCollection(name: string): Promise<Record<string, unknown>[]> {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...(serialize(d.data()) as Record<string, unknown>) }));
}

interface ExportState {
  status: "idle" | "loading" | "done" | "error";
  message?: string;
  counts?: Record<string, number>;
}

export default function ExportDataPage() {
  const [state, setState] = useState<ExportState>({ status: "idle" });

  const runExport = async () => {
    setState({ status: "loading" });
    try {
      const [tasks, readingPassages, youTuberTasks] = await Promise.all([
        fetchCollection("tasks"),
        fetchCollection("readingPassages"),
        fetchCollection("youTuberTasks").catch(() => []),
      ]);

      const payload = {
        exportedAt: new Date().toISOString(),
        collections: { tasks, readingPassages, youTuberTasks },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legacy-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setState({
        status: "done",
        counts: {
          tasks: tasks.length,
          readingPassages: readingPassages.length,
          youTuberTasks: youTuberTasks.length,
        },
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "エクスポートに失敗しました",
      });
    }
  };

  return (
    <PrepShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-xl font-bold text-gray-900">旧データのエクスポート</h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          旧仕様の Writing 問題（<code>tasks</code>）と Reading パッセージ
          （<code>readingPassages</code>）を 1 つの JSON にまとめてダウンロードします。
          ログイン済みのこのブラウザで実行してください。ダウンロードした JSON を開発者に渡すと、
          新仕様へ問題・画像・日本語訳を移行できます。
        </p>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <Button
            onClick={runExport}
            disabled={state.status === "loading"}
            className="bg-eg hover:bg-eg-dark text-black"
          >
            {state.status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> エクスポート中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> 旧データを JSON でダウンロード
              </>
            )}
          </Button>

          {state.status === "done" && state.counts && (
            <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" /> エクスポート完了（ダウンロードを開始しました）
              </div>
              <ul className="mt-2 text-xs text-gray-600 space-y-0.5">
                <li>tasks（Writing 問題）: {state.counts.tasks} 件</li>
                <li>readingPassages（Integrated 用パッセージ）: {state.counts.readingPassages} 件</li>
                <li>youTuberTasks: {state.counts.youTuberTasks} 件</li>
              </ul>
              <p className="mt-2 text-[11px] text-gray-400">
                ダウンロードされた JSON ファイルを開発者に共有してください。
              </p>
            </div>
          )}

          {state.status === "error" && (
            <div className="mt-5 rounded-xl bg-rose-50 border border-rose-100 p-4">
              <div className="flex items-center gap-2 text-rose-700 font-medium text-sm">
                <AlertCircle className="w-4 h-4" /> エクスポートに失敗しました
              </div>
              <p className="mt-1 text-xs text-rose-600">{state.message}</p>
              <p className="mt-2 text-[11px] text-gray-400">
                ログイン状態を確認してください（未ログインだと Firestore の読み取りが拒否されます）。
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-gray-400">
          ※ このページは移行用の一時的なユーティリティです。移行完了後に削除して構いません。
        </p>
      </div>
    </PrepShell>
  );
}
