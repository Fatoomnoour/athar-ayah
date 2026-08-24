export type TokenStatus = "matched" | "missing" | "extra" | "uncertain";

export interface AlignedToken {
  expected?: string;
  spoken?: string;
  status: TokenStatus;
}

export interface VerseMatchResult {
  verseNumber: number;
  expectedText: string;
  spokenText: string;
  alignment: AlignedToken[];
  matchedWords: number;
  expectedWords: number;
  score: number;
  possibleIssues: Array<"word-omission" | "word-substitution" | "possible-long-pause">;
}

export interface RecitationMatchResult {
  verses: VerseMatchResult[];
  matchedWords: number;
  expectedWords: number;
  score: number;
}

/** Normalize speech only; canonical Quran text must never be replaced by this output. */
export function normalizeArabicForMatching(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأٱآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[،؛؟,.!?]/g, " ")
    .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeArabic(value: string): string[] {
  const normalized = normalizeArabicForMatching(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function similarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + cost,
      );
      diagonal = above;
    }
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

/** Needleman-Wunsch-style word alignment with a small fuzzy-match band. */
export function alignArabicWords(expectedText: string, spokenText: string): AlignedToken[] {
  const expected = tokenizeArabic(expectedText);
  const spoken = tokenizeArabic(spokenText);
  const rows = expected.length + 1;
  const columns = spoken.length + 1;
  const score: number[][] = Array.from({ length: rows }, () => Array(columns).fill(0));
  const operation: Array<Array<"match" | "missing" | "extra"> > = Array.from(
    { length: rows },
    () => Array(columns).fill("match"),
  );
  const gapPenalty = -1;

  for (let row = 1; row < rows; row += 1) {
    score[row][0] = row * gapPenalty;
    operation[row][0] = "missing";
  }
  for (let column = 1; column < columns; column += 1) {
    score[0][column] = column * gapPenalty;
    operation[0][column] = "extra";
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const wordSimilarity = similarity(expected[row - 1], spoken[column - 1]);
      const diagonal = score[row - 1][column - 1] + (wordSimilarity >= 0.72 ? wordSimilarity : -1);
      const missing = score[row - 1][column] + gapPenalty;
      const extra = score[row][column - 1] + gapPenalty;
      const best = Math.max(diagonal, missing, extra);
      score[row][column] = best;
      operation[row][column] = best === diagonal ? "match" : best === missing ? "missing" : "extra";
    }
  }

  const alignment: AlignedToken[] = [];
  let row = expected.length;
  let column = spoken.length;
  while (row > 0 || column > 0) {
    const currentOperation = operation[row][column];
    if (row > 0 && column > 0 && currentOperation === "match") {
      const wordSimilarity = similarity(expected[row - 1], spoken[column - 1]);
      alignment.unshift({
        expected: expected[row - 1],
        spoken: spoken[column - 1],
        status: wordSimilarity === 1 ? "matched" : wordSimilarity >= 0.72 ? "uncertain" : "missing",
      });
      row -= 1;
      column -= 1;
    } else if (row > 0 && (column === 0 || currentOperation === "missing")) {
      alignment.unshift({ expected: expected[row - 1], status: "missing" });
      row -= 1;
    } else {
      alignment.unshift({ spoken: spoken[column - 1], status: "extra" });
      column -= 1;
    }
  }

  return alignment;
}

export function matchRecitation(
  verses: Array<{ number: number; text: string }>,
  spokenText: string,
): RecitationMatchResult {
  const expectedText = verses.map((verse) => verse.text).join(" ");
  const expectedWords = tokenizeArabic(expectedText);
  const spokenWords = tokenizeArabic(spokenText);
  const alignment = alignArabicWords(expectedText, spokenText);
  const matchedWords = alignment.filter((token) => token.status === "matched").length;
  const uncertainCount = alignment.filter((token) => token.status === "uncertain").length;
  const missingCount = alignment.filter((token) => token.status === "missing").length;
  const extraCount = alignment.filter((token) => token.status === "extra").length;
  const verseResults = verses.map((verse) => {
    const verseExpected = tokenizeArabic(verse.text).length;
    const verseMatched = Math.min(verseExpected, matchedWords);
    return {
      verseNumber: verse.number,
      expectedText: verse.text,
      spokenText,
      alignment,
      matchedWords: verseMatched,
      expectedWords: verseExpected,
      score: verseExpected ? Math.round((verseMatched / verseExpected) * 100) : 0,
      possibleIssues: [
        ...(missingCount > 0 ? ["word-omission" as const] : []),
        ...(extraCount > 0 || uncertainCount > 0 ? ["word-substitution" as const] : []),
      ],
    };
  });

  return {
    verses: verseResults,
    matchedWords,
    expectedWords: expectedWords.length,
    score: expectedWords.length ? Math.round((matchedWords / expectedWords.length) * 100) : 0,
  };
}
