const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace('export interface ReadingProgress {', `export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  type: 'weekly' | 'monthly';
  reward: number; // points
}

export interface ReadingProgress {`);

code = code.replace(
  '  badges: string[]; // e.g., ["first_verse", "7_day_streak"]',
  '  badges: string[]; // e.g., ["first_verse", "7_day_streak"]\n  totalReadTimeMinutes?: number;\n  surahReadCounts?: Record<string, number>;\n  totalVersesRead?: number;\n  lastReadDate?: string;\n  khatmahPercentage?: number;\n  treeLevel?: number;\n  challenges?: Challenge[];'
);

code = code.replace(
  '  intervalDays?: number;',
  '  intervalDays?: number;\n  easeFactor?: number; // For SM-2 Spaced Repetition\n  repetitions?: number;'
);

fs.writeFileSync('src/types.ts', code);
