export function normalizePracticeQuestionText(text: string | null | undefined): string {
  if (typeof text !== "string") return ""

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
}

export function stripQuestionTypeForStudent(questionText: string): string {
  return normalizePracticeQuestionText(questionText)
    .replace(/^\s*QUESTION_TYPE\s*:\s*.*$/gim, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim()
}

export function formatExactAnswerQuestionText(questionText: string, answer?: string): string {
  const normalized = stripQuestionTypeForStudent(questionText)
  const answerLength = (answer ?? "").trim().length

  if (!answerLength) return normalized

  const placeholderRegex = /_{3,}|-{3,}/g
  let match: RegExpExecArray | null

  while ((match = placeholderRegex.exec(normalized)) !== null) {
    const start = match.index
    const end = start + match[0].length
    const prevChar = start === 0 ? "" : normalized[start - 1]
    const nextChar = end >= normalized.length ? "" : normalized[end]
    const hasSafeLeftBoundary = start === 0 || /\s/.test(prevChar)
    const hasSafeRightBoundary = end === normalized.length || /\s/.test(nextChar)

    if (!hasSafeLeftBoundary || !hasSafeRightBoundary) {
      continue
    }

    const maskChar = match[0][0]
    const masked = maskChar.repeat(Math.max(answerLength, 3))
    return normalized.slice(0, start) + masked + normalized.slice(end)
  }

  return normalized
}

export function formatPracticeQuestionForDisplay(questionText: string, answer?: string): string {
  if (typeof answer === "string") {
    return formatExactAnswerQuestionText(questionText, answer)
  }

  return stripQuestionTypeForStudent(questionText)
}
