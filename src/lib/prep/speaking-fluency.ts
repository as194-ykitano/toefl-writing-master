export interface TimedSpeechWord { word: string; start: number; end: number }

export interface SpeechDisfluencyMetrics {
  wordRepetitionCount: number;
  phraseRestartCount: number;
  selfCorrectionCount: number;
  startDelaySec: number;
  wordRepetitionIndexes: number[];
  correctionIndexes: number[];
}

const normalize = (word: string) => word.toLowerCase().replace(/[^a-z0-9']/g, "");
const EMPHATIC_OR_VALID_REPEATS = new Set(["very", "really", "no", "yes", "yeah", "had", "that"]);

export function detectSpeechDisfluencies(transcript: string, words: TimedSpeechWord[]): SpeechDisfluencyMetrics {
  const tokens = (words.length ? words.map((w) => w.word) : transcript.split(/\s+/)).map(normalize).filter(Boolean);
  let wordRepetitionCount = 0;
  const wordRepetitionIndexes = new Set<number>();
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1] && !EMPHATIC_OR_VALID_REPEATS.has(tokens[i])) {
      if (i === 1 || tokens[i - 1] !== tokens[i - 2]) wordRepetitionCount++;
      wordRepetitionIndexes.add(i - 1);
      wordRepetitionIndexes.add(i);
    }
  }

  // A retry can follow a short false start or filler instead of being adjacent.
  let phraseRestartCount = 0;
  const correctionIndexes = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    let matched = 0;
    let retryAt = -1;
    for (let size = 4; size >= 2; size--) {
      if (i + size > tokens.length) continue;
      const first = tokens.slice(i, i + size).join(" ");
      const searchEnd = Math.min(tokens.length - size, i + size + 8);
      for (let j = i + size; j <= searchEnd; j++) {
        if (first === tokens.slice(j, j + size).join(" ")) {
          matched = size;
          retryAt = j;
          break;
        }
      }
      if (matched) break;
    }
    if (matched) {
      phraseRestartCount++;
      for (let j = i; j < i + matched; j++) correctionIndexes.add(j);
      for (let j = retryAt; j < retryAt + matched; j++) correctionIndexes.add(j);
      i = retryAt + matched - 1;
    }
  }

  const lower = transcript.toLowerCase();
  const correctionCue = /\b(?:what i mean is|let me rephrase|sorry,?\s+i mean|or rather|i mean)\b/g;
  const selfCorrectionCount = lower.match(correctionCue)?.length ?? 0;
  const cueTokens = [["what", "i", "mean", "is"], ["let", "me", "rephrase"], ["i", "mean"], ["or", "rather"]];
  for (const cue of cueTokens) {
    for (let i = 0; i <= tokens.length - cue.length; i++) {
      if (cue.every((token, offset) => tokens[i + offset] === token)) {
        for (let j = i; j < i + cue.length; j++) correctionIndexes.add(j);
      }
    }
  }

  return {
    wordRepetitionCount,
    phraseRestartCount,
    selfCorrectionCount,
    startDelaySec: Math.round(Math.max(0, words[0]?.start ?? 0) * 10) / 10,
    wordRepetitionIndexes: [...wordRepetitionIndexes],
    correctionIndexes: [...correctionIndexes],
  };
}
