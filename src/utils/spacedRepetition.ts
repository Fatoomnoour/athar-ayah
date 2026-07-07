/**
 * SuperMemo-2 (SM-2) Algorithm implementation for Spaced Repetition
 */

export interface SM2Data {
  interval: number; // Interval in days
  repetitions: number;
  easeFactor: number;
}

export function calculateNextReview(
  quality: number, // 0-5 (0: complete blackout, 5: perfect response)
  previousData: SM2Data
): SM2Data {
  let { interval, repetitions, easeFactor } = previousData;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  return { interval, repetitions, easeFactor };
}
