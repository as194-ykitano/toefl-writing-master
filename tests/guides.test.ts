import { describe, expect, it } from "vitest";
import { SEEDED_GUIDES } from "@/lib/guides";
import { getGuideManualSteps } from "@/lib/guide-manual";
import { existsSync } from "node:fs";
import path from "node:path";

describe("seeded usage guides", () => {
  it("has unique stable IDs and is published by default", () => {
    expect(new Set(SEEDED_GUIDES.map((guide) => guide.id)).size).toBe(SEEDED_GUIDES.length);
    expect(SEEDED_GUIDES.every((guide) => guide.isPublished && guide.content.length > 100)).toBe(true);
  });

  it("covers every supported exam skill and the shared flows", () => {
    const expected = [
      "toefl:reading", "toefl:listening", "toefl:speaking", "toefl:writing",
      "ielts:reading", "ielts:listening", "ielts:speaking", "ielts:writing",
      "toeic:reading", "toeic:listening",
    ];
    const actual = new Set(SEEDED_GUIDES.map((guide) => `${guide.exam}:${guide.skill}`));
    for (const key of expected) expect(actual.has(key), `${key} guide`).toBe(true);
    expect(SEEDED_GUIDES.some((guide) => guide.category === "mock-test")).toBe(true);
    expect(SEEDED_GUIDES.some((guide) => guide.category === "learning-data")).toBe(true);
    expect(SEEDED_GUIDES.some((guide) => guide.category === "content")).toBe(true);
  });

  it("has generated step GIFs for every seeded guide", () => {
    for (const guide of SEEDED_GUIDES) {
      const steps = getGuideManualSteps(guide.id);
      expect(steps.length, `${guide.id} steps`).toBeGreaterThan(0);
      for (const step of steps) {
        if (step.comingSoon) continue;
        expect(step.src, `${guide.id}: ${step.key} src`).toBeTruthy();
        expect(existsSync(path.join(process.cwd(), "public", step.src!)), `${guide.id}: ${step.src}`).toBe(true);
      }
    }
  });
});
