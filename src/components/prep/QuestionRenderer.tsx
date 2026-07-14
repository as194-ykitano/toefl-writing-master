"use client";

// 設問 1 問分の回答 UI
// multiple_choice / multi_select / gap_fill / matching / true_false_notgiven に対応

import { PracticeQuestion } from "@/lib/prep/types";

interface QuestionRendererProps {
  question: PracticeQuestion;
  value: string | string[] | null;
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled,
}: QuestionRendererProps) {
  const { type } = question;

  if (type === "multiple_choice" || type === "true_false_notgiven") {
    const options = question.options ?? [];
    return (
      <div className="space-y-2.5">
        {options.map((option, i) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                selected
                  ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                  selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-400"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-gray-800 leading-relaxed">{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "multi_select") {
    const options = question.options ?? [];
    const selectedValues = Array.isArray(value) ? value : [];
    const requiredCount = Array.isArray(question.answer) ? question.answer.length : 2;
    const toggle = (option: string) => {
      if (selectedValues.includes(option)) {
        onChange(selectedValues.filter((v) => v !== option));
      } else if (selectedValues.length < requiredCount) {
        onChange([...selectedValues, option]);
      }
    };
    return (
      <div className="space-y-2.5">
        <p className="text-xs text-gray-500">{requiredCount} つ選択してください</p>
        {options.map((option) => {
          const selected = selectedValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => toggle(option)}
              className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                selected
                  ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <span
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                  selected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                }`}
              >
                {selected && (
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span className="text-sm text-gray-800 leading-relaxed">{option}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "matching") {
    const targets = question.matchTargets ?? [];
    return (
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => {
          const selected = value === target;
          return (
            <button
              key={target}
              type="button"
              disabled={disabled}
              onClick={() => onChange(target)}
              className={`min-w-[3rem] px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                selected
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {target}
            </button>
          );
        })}
      </div>
    );
  }

  // gap_fill
  return (
    <input
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="回答を入力"
      className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
    />
  );
}
