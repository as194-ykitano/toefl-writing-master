import { describe, expect, it } from "vitest";
import { parseFormattedPracticeText } from "../src/lib/prep/formatted-import";

describe("formatted practice import", () => {
  it("parses MCQ and resolves an answer letter to option text", () => {
    const [block] = parseFormattedPracticeText(`ARTICLE:\nPassage\nQUESTION_TYPE: mcq\nQUESTION:\nWhat?\nA: First\nB: Second\nC: Third\nD: Fourth\nANSWER: B\nEXPLANATION:\n理由`);
    expect(block.article).toBe("Passage");
    expect(block.questions[0].answer).toBe("Second");
    expect(block.questions[0].explanation).toBe("理由");
  });

  it("parses exact answer questions", () => {
    const [block] = parseFormattedPracticeText(`ARTICLE: Text\nQUESTION_TYPE: exact_answer\nQUESTION: Complete it\nANSWER: word\nEXPLANATION: 解説`);
    expect(block.questions[0].type).toBe("gap_fill");
    expect(block.questions[0].answer).toBe("word");
  });
});
