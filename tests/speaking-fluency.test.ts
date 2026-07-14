import { describe, expect, it } from "vitest";
import { detectSpeechDisfluencies } from "../src/lib/prep/speaking-fluency";

describe("detectSpeechDisfluencies", () => {
  it("detects word repetition and ignores common emphasis", () => {
    const result = detectSpeechDisfluencies("I I think it was very very useful", []);
    expect(result.wordRepetitionCount).toBe(1);
  });
  it("detects an adjacent phrase restart", () => {
    expect(detectSpeechDisfluencies("I want to I want to study abroad", []).phraseRestartCount).toBe(1);
  });
  it("detects a retry after intervening words or a filler", () => {
    const result = detectSpeechDisfluencies(
      "I don't think about that I don't think that helps a lot uh that helps um",
      []
    );
    expect(result.phraseRestartCount).toBeGreaterThanOrEqual(2);
    expect(result.correctionIndexes.length).toBeGreaterThan(0);
  });
  it("detects correction cues and starting delay", () => {
    const result = detectSpeechDisfluencies("I went, I mean, I visited London", [{ word: "I", start: 1.24, end: 1.4 }]);
    expect(result.selfCorrectionCount).toBe(1);
    expect(result.startDelaySec).toBe(1.2);
  });
});
