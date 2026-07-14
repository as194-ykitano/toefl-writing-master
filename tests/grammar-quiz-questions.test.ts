import { describe, expect, it } from "vitest";
import { GRAMMAR_QUIZ_QUESTIONS } from "../src/lib/prep/grammar-quiz-questions";

describe("Grammar Quiz question bank", () => {
  it("contains 100 unique, valid four-choice questions", () => {
    expect(GRAMMAR_QUIZ_QUESTIONS).toHaveLength(100);
    expect(new Set(GRAMMAR_QUIZ_QUESTIONS.map((question) => question.sentence)).size).toBe(100);

    for (const question of GRAMMAR_QUIZ_QUESTIONS) {
      expect(question.sentence).toContain("___");
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices).size).toBe(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(4);
      expect(question.choices[question.answer]).toBeTruthy();
      expect(question.explanation).toBeTruthy();
      expect(question.category).toBeTruthy();
    }
  });

  it("distributes correct answers evenly across the four positions", () => {
    const positions = [0, 1, 2, 3].map(
      (position) => GRAMMAR_QUIZ_QUESTIONS.filter((question) => question.answer === position).length,
    );

    expect(positions).toEqual([25, 25, 25, 25]);
  });
});
