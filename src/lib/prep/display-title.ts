/** Removes internal generation/retest markers from learner-facing Reading titles. */
export function cleanReadingTitle(title: string): string {
  return title
    .replace(/^\s*\d{2,}\s*[-_:]?\s*/i, "")
    .replace(/\s*\b(?:\d+\s+)?Retest(?:\s*0*\d+)?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

