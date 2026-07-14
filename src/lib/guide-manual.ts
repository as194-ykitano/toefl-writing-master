import generatedSteps from "./generated-guide-steps.json";

export type GuideManualStep = {
  key: string;
  title: string;
  description: string;
  src?: string;
  mediaType?: "gif" | "image";
  details?: string[];
  comingSoon?: boolean;
};

const stepsByGuide = generatedSteps as Record<string, GuideManualStep[]>;

export function getGuideManualSteps(guideId: string): GuideManualStep[] {
  return stepsByGuide[guideId] ?? [];
}

function normalizeMediaSource(value: unknown): string | undefined {
  const src = String(value ?? "").trim();
  if (!src) return undefined;
  if ((!src.startsWith("/") || src.startsWith("//")) && !/^https:\/\//i.test(src)) {
    throw new Error("画像・GIFのURLは / から始まるパスまたは https:// URLを指定してください。");
  }
  return src;
}

export function normalizeGuideSteps(value: unknown): GuideManualStep[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("操作手順の形式が不正です。");
  if (value.length > 100) throw new Error("操作手順は100件以内にしてください。");

  const keys = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`手順${index + 1}の形式が不正です。`);
    const data = item as Record<string, unknown>;
    const key = String(data.key ?? `step-${index + 1}`).trim();
    const title = String(data.title ?? "").trim();
    if (!key) throw new Error(`手順${index + 1}のキーが空です。`);
    if (keys.has(key)) throw new Error(`手順キー「${key}」が重複しています。`);
    if (!title) throw new Error(`手順${index + 1}のタイトルを入力してください。`);
    keys.add(key);

    const src = normalizeMediaSource(data.src);
    const details = Array.isArray(data.details)
      ? data.details.map((detail) => String(detail).trim()).filter(Boolean)
      : String(data.details ?? "").split(/\r?\n/).map((detail) => detail.trim()).filter(Boolean);
    const requestedMediaType = data.mediaType === "gif" || data.mediaType === "image" ? data.mediaType : undefined;
    const mediaType = src ? (requestedMediaType ?? (/\.gif(?:\?|$)/i.test(src) ? "gif" : "image")) : undefined;

    return {
      key,
      title,
      description: String(data.description ?? "").trim(),
      ...(src ? { src, mediaType } : {}),
      ...(details.length ? { details } : {}),
      ...(data.comingSoon === true ? { comingSoon: true } : {}),
    };
  });
}
