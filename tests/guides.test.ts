import { describe, expect, it } from "vitest";
import { SEEDED_GUIDES } from "@/lib/guides";
import { getGuideManualSteps, normalizeGuideSteps } from "@/lib/guide-manual";
import { existsSync } from "node:fs";
import path from "node:path";

describe("seeded usage guides", () => {
  it("has unique stable IDs and meaningful content", () => {
    expect(new Set(SEEDED_GUIDES.map((guide) => guide.id)).size).toBe(SEEDED_GUIDES.length);
    expect(SEEDED_GUIDES.every((guide) => guide.content.length > 100)).toBe(true);
    // mock-tests is intentionally unpublished (Coming Soon) until the mock test feature ships.
    const unpublished = SEEDED_GUIDES.filter((guide) => !guide.isPublished).map((guide) => guide.id);
    expect(unpublished).toEqual(["mock-tests"]);
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
    // learning-data and video-courses are grouped under the shared "start" category.
    expect(SEEDED_GUIDES.find((guide) => guide.id === "learning-data")?.category).toBe("start");
    expect(SEEDED_GUIDES.find((guide) => guide.id === "video-courses")?.category).toBe("start");
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

describe("editable guide steps", () => {
  it("keeps the submitted order and normalizes media metadata", () => {
    const steps = normalizeGuideSteps([
      { key: "second", title: "2番目", description: "説明", src: "/guide-gifs/example.gif" },
      { key: "first", title: "1番目", description: "説明", details: "確認A\n確認B" },
    ]);

    expect(steps.map((step) => step.key)).toEqual(["second", "first"]);
    expect(steps[0].mediaType).toBe("gif");
    expect(steps[1].details).toEqual(["確認A", "確認B"]);
  });

  it("rejects duplicate step keys and unsafe media URLs", () => {
    expect(() => normalizeGuideSteps([
      { key: "same", title: "A" },
      { key: "same", title: "B" },
    ])).toThrow("重複");
    expect(() => normalizeGuideSteps([
      { key: "unsafe", title: "Unsafe", src: "javascript:alert(1)" },
    ])).toThrow("URL");
  });
});
