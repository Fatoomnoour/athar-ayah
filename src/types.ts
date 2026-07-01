export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  displayName?: string;
}

export interface QuranNote {
  id: string;
  userId: string;
  surahId: number;
  surahName: string;
  verseNumber: number;
  verseText: string; // Verified Quran text placeholder (the user requests never using AI to generate verses)
  reflectionText: string; // The reflection notes typed by the user
  tags: string[];
  pinned: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  surahId: number;
  surahName: string;
  verseNumber: number;
  note?: string;
  createdAt: string;
}

export interface ReadingProgress {
  userId: string;
  lastSurahId: number;
  lastSurahName: string;
  lastVerseNumber: number;
  dailyGoalVerses: number;
  completedSurahs: number[]; // surahIds
  
  // Gamification fields
  currentStreak: number;
  longestStreak: number;
  points: number; // نقاط أثر
  weeklyGoalProgress: number; // 0 to 100
  streakRecoveriesAvailable: number; // One monthly streak recovery
  badges: string[]; // e.g., ["first_verse", "7_day_streak"]
  
  updatedAt: string;
}

export interface RevisionSession {
  id: string;
  date: string;
  status: "excellent" | "good" | "weak";
}

export interface MemorizationPlan {
  id: string;
  userId: string;
  title: string;
  surahId: number;
  surahName: string;
  startVerse: number;
  endVerse: number;
  targetDate: string;
  completed: boolean;
  revisionHistory: RevisionSession[];
  createdAt: string;
  nextReviewDate?: string;
  intervalDays?: number;
}

export interface DBState {
  users: User[];
  notes: QuranNote[];
  bookmarks: Bookmark[];
  progress: Record<string, ReadingProgress>; // keyed by userId
  plans: MemorizationPlan[];
}

export interface GroupMember {
  userId: string;
  name: string;
  role: "admin" | "member";
  joinedAt: string;
}

export interface GroupReflection {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  surahId: number;
  surahName: string;
  verseRange: string;
  reflectionText: string;
  reactions: number;
  isPinned: boolean;
  createdAt: string;
}

export interface QuranGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  joinCode: string;
  surahId: number;
  surahName: string;
  verseRange: string;
  goalType: "daily" | "weekly";
  maxMembers: number;
  members: GroupMember[];
  reflections: GroupReflection[];
  createdAt: string;
  adminId: string;
}
