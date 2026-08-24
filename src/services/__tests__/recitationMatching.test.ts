import { describe, expect, it } from "vitest";
import {
  alignArabicWords,
  matchRecitation,
  normalizeArabicForMatching,
  tokenizeArabic,
} from "../recitationMatchingService";

describe("Recitation matching service", () => {
  it("normalizes speech variants without changing the canonical source", () => {
    expect(normalizeArabicForMatching("إِنَّ الْحَمْدَ، لِلَّهِ")).toBe("ان الحمد لله");
    expect(tokenizeArabic("الحَمْدُ لِلَّهِ")).toEqual(["الحمد", "لله"]);
  });

  it("marks exact words as matched", () => {
    const alignment = alignArabicWords("الحمد لله رب العالمين", "الحمد لله رب العالمين");
    expect(alignment.every((token) => token.status === "matched")).toBe(true);
  });

  it("identifies omissions and extra spoken words", () => {
    const omissionAlignment = alignArabicWords("الحمد لله رب", "الحمد لله");
    const extraAlignment = alignArabicWords("الحمد لله", "الحمد لله يا");
    expect(omissionAlignment.some((token) => token.status === "missing")).toBe(true);
    expect(extraAlignment.some((token) => token.status === "extra")).toBe(true);
  });

  it("returns a bounded verse-level score and possible issue hints", () => {
    const result = matchRecitation(
      [{ number: 1, text: "الحمد لله رب العالمين" }],
      "الحمد لله رب",
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.verses[0]?.possibleIssues).toContain("word-omission");
  });
});
