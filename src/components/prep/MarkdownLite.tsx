"use client";

// 軽量 markdown レンダラー（依存パッケージなし）
// IELTS リスニングの参照資料（表・フォーム）などの表示用。
// 対応: パイプテーブル / 見出し (#〜###) / 箇条書き (-, *, ・) / 太字 (**) / 段落

import { Fragment, ReactNode } from "react";

function renderInline(text: string): ReactNode {
  const parts = text.split(/(!\[[^\]]*\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const image = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (image) {
      return <img key={i} src={image[2]} alt={image[1] || "Uploaded image"} className="my-4 max-h-[520px] max-w-full rounded-lg border object-contain" />;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-gray-100 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}.*$/.test(line) && /-/.test(line) && !/[a-zA-Z0-9]/.test(line);
}

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

export default function MarkdownLite({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // テーブル
    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && (isTableRow(lines[i]) || isTableSeparator(lines[i]))) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => isTableRow(l) && !isTableSeparator(l)).map(splitCells);
      if (rows.length > 0) {
        const [header, ...body] = rows;
        blocks.push(
          <div key={key++} className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {header.map((cell, c) => (
                    <th
                      key={c}
                      className="border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-left font-semibold text-gray-700"
                    >
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className="border border-gray-200 px-2.5 py-1.5 text-gray-700 align-top">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 見出し
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <div
          key={key++}
          className={`font-bold text-gray-900 ${level === 1 ? "text-sm" : "text-xs"}`}
        >
          {renderInline(heading[2])}
        </div>
      );
      i++;
      continue;
    }

    // 箇条書き
    if (/^\s*([-*・]|\d+[.．])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*・]|\d+[.．])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*・]|\d+[.．])\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-4 space-y-0.5">
          {items.map((item, n) => (
            <li key={n} className="text-gray-700">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 段落
    blocks.push(
      <p key={key++} className="text-gray-700 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-2 text-xs ${className}`}>{blocks}</div>;
}
