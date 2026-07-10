"use client";

// 試験種別の切替（画面左上のドロップダウン）
// 現在の試験名 + ▾ を押すと下に候補（TOEFL / IELTS / Advanced / …）が開き、
// 選ぶとその試験の Home（Advanced はハブ）へ遷移する。
// EXAM_OPTIONS に 1 行足すだけで候補が増える（TOEIC などは comingSoon）。

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lock } from "lucide-react";
import { useExam, EXAM_OPTIONS } from "@/contexts/ExamContext";
import { CategoryId } from "@/lib/prep/types";

interface ExamSwitcherProps {
  className?: string;
}

function isCategoryId(value: string): value is CategoryId {
  return value === "toefl" || value === "ielts" || value === "advanced";
}

export default function ExamSwitcher({ className = "" }: ExamSwitcherProps) {
  const router = useRouter();
  const { exam, setExam } = useExam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current = EXAM_OPTIONS.find((o) => o.id === exam) ?? EXAM_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (id: string, href: string, comingSoon?: boolean) => {
    if (comingSoon) return;
    if (isCategoryId(id)) setExam(id);
    setOpen(false);
    router.push(href);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-bold tracking-tight text-gray-900 hover:border-gray-300 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-eg-dark">{current.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
          role="listbox"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            試験を切り替える
          </div>
          {EXAM_OPTIONS.map((opt) => {
            const active = opt.id === exam;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={active}
                disabled={opt.comingSoon}
                onClick={() => handleSelect(opt.id, opt.href, opt.comingSoon)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  opt.comingSoon
                    ? "cursor-not-allowed opacity-50"
                    : active
                      ? "bg-eg-soft"
                      : "hover:bg-gray-50"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${active ? "text-eg-deep" : "text-gray-900"}`}>
                    {opt.label}
                  </span>
                  {opt.sublabel && (
                    <span className="block text-[11px] text-gray-400 truncate">{opt.sublabel}</span>
                  )}
                </span>
                {opt.comingSoon ? (
                  <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                ) : active ? (
                  <Check className="w-4 h-4 text-eg-dark flex-shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
