import { describe, expect, it } from "vitest";
import { normalizePracticeSet, practiceSetDocumentId } from "../src/lib/prep/practice-set-admin";

describe("practice set admin", () => {
  it("creates a stable Firestore document ID", () => {
    expect(practiceSetDocumentId("toefl", "reading", "set/1"))
      .toBe(practiceSetDocumentId("toefl", "reading", "set/1"));
    expect(practiceSetDocumentId("toefl", "reading", "set/1")).not.toContain("/");
  });

  it("accepts a valid reading set", () => {
    const result = normalizePracticeSet({
      id: "reading-1", exam: "toefl", skill: "reading", title: "Test",
      difficulty: "medium", questions: [], paragraphs: [], timeLimitSec: 60,
    });
    expect(result.id).toBe("reading-1");
  });

  it("rejects a reading set without questions", () => {
    expect(() => normalizePracticeSet({
      id: "reading-1", exam: "toefl", skill: "reading", title: "Test", difficulty: "medium",
    })).toThrow("questions");
  });
});
