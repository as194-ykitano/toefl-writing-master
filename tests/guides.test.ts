import { describe, expect, it } from "vitest";
import { SEEDED_GUIDES } from "@/lib/guides";

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
});
