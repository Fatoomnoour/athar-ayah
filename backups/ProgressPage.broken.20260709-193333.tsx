import React, { useState, useEffect } from "react";
import {
  Activity,
  Plus,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Star,
  Clock,
  Flame,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  RefreshCw,
  Play,
  Share2,
  Target,
  BarChart2,
  TrendingUp,
  Compass,
  ChevronRight,
  Zap,
  Check,
  Sparkles,
  Goal,
  BookMarked,
} from "lucide-react";

import {
  getReadingProgress,
  getUserMemorizationPlans,
  getUserNotes,
} from "../services/firestoreService";

import { SURAH_LIST, SURAH_VERSE_COUNTS } from "../utils/quranUtils";
import BookmarksTab from "./BookmarksTab";
import ProgressTab from "./ProgressTab";
import { User, MemorizationPlan, ReadingProgress } from "../types";
import confetti from "canvas-confetti";

interface ProgressPageProps {
  currentUser: User | null;
  onStartMemorizeSession: (plan: MemorizationPlan) => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  onRefreshStats: () => void;
  onNavigateToReader: (surahId?: number, verseNum?: number) => void;
  onNavigateToTab: (tab: string) => void;
}


export default function ProgressPage({
  currentUser,
  onStartMemorizeSession,
  onShowToast,
  onRefreshStats,
  onNavigateToReader,
  onNavigateToTab,
}: ProgressPageProps) {
  const [plans, setPlans] = useState<MemorizationPlan[]>([]);
  const [notes, setNotes] = useState<QuranNote[]>([]);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "journey" | "plans" | "achievements" | "favorites"
  >("journey");

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;

    setIsLoading(true);

    try {
      const [plansData, progressData, notesData] = await Promise.all([
        getUserMemorizationPlans(currentUser.id),
        getReadingProgress(currentUser.id),
        getUserNotes(currentUser.id),
      ]);

      setPlans(plansData || []);
      setNotes(notesData || []);
      setProgress(progressData || null);
    } catch (err) {
      console.error("Error loading progress page data:", err);
      onShowToast("حدث خطأ أثناء جلب البيانات", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const shareText = `لقد قرأت ${
      progress?.totalVersesRead || 0
    } آية وأتممت ${(progress?.khatmahPercentage || 0).toFixed(
      1
    )}% من الختمة! تعال شاركني الأجر في تطبيق أثر آية. \n ${
      window.location.origin
    }`;

    if (navigator.share) {
      navigator
        .share({
          title: "رحلتي مع أثر آية",
          text: shareText,
          url: window.location.origin,
        })
        .catch(console.error);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      onShowToast("تم نسخ رابط التطبيق لمشاركته!", "success");
    }

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const openLastReadingPosition = () => {
    const surahId = progress?.lastSurahId || 1;
    const verseNumber = progress?.lastVerseNumber || 1;
    onNavigateToReader(surahId, verseNumber);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="text-sm text-slate-400">
          جاري تحميل لوحة الإنجاز...
        </span>
      </div>
    );
  }

  const khatmahPercentage =
    progress?.khatmahPercentage || ((progress?.totalVersesRead || 0) / 6236) * 100;
  const hoursRead = Math.floor((progress?.totalReadTimeMinutes || 0) / 60);
  const minsRead = (progress?.totalReadTimeMinutes || 0) % 60;

  // --- Date Helpers ---
  function getMillis(value: any): number {
    if (!value) return 0;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function isToday(value: any): boolean {
    const ms = getMillis(value);
    if (!ms) return false;
    const d = new Date(ms);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  // --- Achievements Data Logic ---
  const points = progress?.points || 0;
  const DAILY_SCORE_TARGET = 50;

  const hasTodayReading = isToday(progress?.lastReadDate);
  const todayNotesCount = notes.filter(note => isToday(note.createdAt)).length;
  const hasTodayTadabbur = todayNotesCount > 0;
  const todayReviewsCount = plans.filter(p => p.revisionHistory?.some(rh => isToday(rh.date))).length;
  const hasTodayReview = todayReviewsCount > 0;
  const hasTodaySavedPosition = hasTodayReading; // Assuming saving position happens with reading

  let dailyScore = 0;
  if (hasTodayReading) dailyScore += 15;
  if (hasTodayTadabbur) dailyScore += 10;
  if (hasTodayReview) dailyScore += 10;
  if (hasTodaySavedPosition) dailyScore += 5;

  const allDailyTasksCompleted = hasTodayReading && hasTodayTadabbur && hasTodayReview && hasTodaySavedPosition;
  if (allDailyTasksCompleted) dailyScore += 10;
  dailyScore = Math.min(dailyScore, DAILY_SCORE_TARGET);

  const treeStages = [
    { level: 1, name: "بذرة", icon: "🌱", minPoints: 0, maxPoints: 99 },
    { level: 2, name: "نبتة", icon: "🌿", minPoints: 100, maxPoints: 299 },
    { level: 3, name: "غرسة", icon: "🪴", minPoints: 300, maxPoints: 699 },
    { level: 4, name: "شجرة", icon: "🌳", minPoints: 700, maxPoints: 1499 }, 
    { level: 5, name: "ظلّ وثمار", icon: "🍎", minPoints: 1500, maxPoints: Infinity }
  ];

  const currentTreeStage = treeStages.slice().reverse().find(s => points >= s.minPoints) || treeStages[0];
  const nextTreeStage = treeStages.find(s => s.level === currentTreeStage.level + 1);
  const treeProgress = nextTreeStage ? Math.min(100, ((points - currentTreeStage.minPoints) / (nextTreeStage.minPoints - currentTreeStage.minPoints)) * 100) : 100;


  const dailyTasks = [ // Updated icons for consistency
    { id: 'read_wird', title: 'قراءة ورد اليوم', description: 'اقرأ عددًا من الآيات اليوم', isCompleted: hasTodayReading, icon: BookOpen, action: openLastReadingPosition },
    { id: 'tadabbur', title: 'خاطرة تدبر', description: 'اكتب خاطرة واحدة على الأقل', isCompleted: hasTodayTadabbur, icon: Edit, action: () => onNavigateToTab("notes") },
    { id: 'hifz_review', title: 'مراجعة الحفظ', description: 'راجع آيات من خطتك الحالية', isCompleted: hasTodayReview, icon: Repeat, action: () => setActiveTab("plans") },
    { id: 'save_position', title: 'تثبيت الموضع', description: 'سجّل آخر موضع وصلت إليه', isCompleted: hasTodaySavedPosition, icon: MapPin, action: () => onNavigateToReader(progress?.lastSurahId, progress?.lastVerseNumber) },
  ];

  const weeklyChallenges = [
    { id: "weekly_surah_kahf", title: "اقرأ سورة الكهف", current: progress?.completedChallengeIds?.includes("weekly_surah_kahf") ? 1 : 0, target: 1, reward: 50, action: () => onNavigateToReader(18, 1) },
    { id: "read_500_ayahs", title: "تلاوة 500 آية", current: progress?.completedChallengeIds?.includes("read_500_ayahs") ? 500 : Math.min(500, progress?.totalVersesRead || 0), target: 500, reward: 200, action: openLastReadingPosition },
  ];

  const badges = {
    reading: [
      { id: 'read_1_day', title: 'قارئ اليوم', requirement: 'أكمل ورد يوم واحد', current: Math.min(1, progress?.currentStreak || 0), target: 1, icon: '📖' },
      { id: 'read_7_days', title: 'سلسلة 7 أيام', requirement: 'حافظ على سلسلة القراءة ٧ أيام', current: Math.min(7, progress?.longestStreak || 0), target: 7, icon: '🔥' },
      { id: 'first_surah', title: 'أول سورة', requirement: 'أكمل قراءة سورة كاملة', current: (progress?.completedSurahs || []).length > 0 ? 1 : 0, target: 1, icon: '🌟' },
      { id: 'juz_complete', title: 'ختم جزء', requirement: 'أكمل قراءة جزء كامل (تقديري)', current: Math.min(30, Math.floor((progress?.totalVersesRead || 0) / 200)), target: 1, icon: '📚' },
      { id: 'khatmah', title: 'ختم القرآن', requirement: 'أكمل ختمة كاملة للقرآن', current: khatmahPercentage, target: 100, icon: '👑' },
    ],
    reflection: [
      { id: 'first_note', title: 'متدبر اليوم', requirement: 'دوّن أول خاطرة تدبر', current: todayNotesCount, target: 1, icon: '✍️' },
      { id: 'active_reflector', title: 'متدبر نشط', requirement: 'دوّن ١٠ خواطر تدبر', current: notes.length, target: 10, icon: '✒️' },
    ],
    memorization: [
      { id: 'first_plan', title: 'حافظ الورد', requirement: 'أنشئ أول خطة حفظ', current: plans.length, target: 1, icon: '🌱' },
      { id: 'mastered_plan', title: 'مراجع ثابت', requirement: 'أتقن مراجعة مقطع واحد', current: plans.filter(p => p.completed).length, target: 1, icon: '🎯' }
    ]
  };

  // Categorize badges for display
  const allFlatBadges = Object.values(badges).flat();
  const earnedBadges = allFlatBadges.filter(b => b.current >= b.target);
  const inProgressBadges = allFlatBadges.filter(b => b.current > 0 && b.current < b.target);
  const lockedBadges = allFlatBadges.filter(b => b.current === 0);

  // Simplified 7-Day Activity Summary (without complex daily logs)
  const last7DaysActivity = {
    activeDays: progress?.currentStreak || 0,
    notesToday: todayNotesCount,
    versesReadToday: hasTodayReading ? (progress?.dailyGoalVerses || 0) : 0, // Simplified to today's goal if read
    reviewsToday: hasTodayReview ? 1 : 0,
  };

  // Streaks
  const readingStreak = {
    current: progress?.currentStreak || 0,
    longest: progress?.longestStreak || 0,
    nextMilestone: (progress?.currentStreak || 0) < 7 ? 7 : ((progress?.currentStreak || 0) < 30 ? 30 : ((progress?.currentStreak || 0) < 100 ? 100 : (progress?.currentStreak || 0) + 100)),
  };

  // Next Best Action (simplified)
  let nextBestActionMessage = "ابدأ تحدي اليوم لفتح أول إنجاز";
  if (!hasTodayReading) {
    nextBestActionMessage = "ابدأ قراءة ورد اليوم لتحافظ على أثرك";
  } else if (!hasTodayTadabbur) {
    nextBestActionMessage = "اكتب خاطرة تدبر واحدة لفتح وسام 'متدبر اليوم'";
  } else if (!hasTodayReview && plans.length > 0) {
    nextBestActionMessage = "راجع خطة حفظك لتثبيت وردك";
  } else if (dailyScore < DAILY_SCORE_TARGET) {
    nextBestActionMessage = `بقيت لك ${DAILY_SCORE_TARGET - dailyScore} نقطة لإكمال إنجاز اليوم`;
  } else if (points < 100) {
    nextBestActionMessage = "واصل التقدم لتنمو شجرتك إلى 'نبتة'";
  }

  return (
    <div
      className="space-y-6 text-right font-sans max-w-5xl mx-auto"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            رحلتي مع القرآن
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
            تتبع إنجازاتك اليومية، وردك، ونمو شجرتك الإيمانية.
          </p>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
        >
          <Share2 className="w-5 h-5" />
          <span>مشاركة الإنجاز</span>
        </button>
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("journey")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "journey"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          الإحصائيات
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "plans"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          خطط الحفظ
        </button>

        <button
          onClick={() => setActiveTab("achievements")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "achievements"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          الأوسمة والشجرة
        </button>

        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            activeTab === "favorites"
              ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            <span>المفضلة</span>
          </div>
        </button>
      </div>

      {activeTab === "journey" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProgressTab
            currentUser={currentUser}
            onRefreshStats={onRefreshStats}
            onNavigateToReader={onNavigateToReader}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  نسبة الختمة
                </span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-black text-slate-800 dark:text-white">
                  {Math.min(100, khatmahPercentage).toFixed(1)}%
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, khatmahPercentage)}%` }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  وقت التلاوة
                </span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800 dark:text-white">
                  {hoursRead}
                </span>
                <span className="text-sm text-slate-500">س</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white ml-2">
                  {minsRead}
                </span>
                <span className="text-sm text-slate-500">د</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  الآيات المقروءة
                </span>
                <div className="p-2 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-black text-slate-800 dark:text-white">
                  {progress?.totalVersesRead || 0}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl text-white flex flex-col justify-between relative overflow-hidden shadow-lg shadow-orange-500/20">
              <div className="flex justify-between items-start relative z-10">
                <span className="text-sm font-bold text-white/90">
                  أيام متتالية
                </span>
                <div className="p-2 bg-white/20 rounded-xl">
                  <Flame className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="mt-4 relative z-10">
                <span className="text-4xl font-black">
                  {progress?.currentStreak || 0}
                </span>
                <span className="text-sm text-white/80 mr-2 font-medium">
                  أيام
                </span>
              </div>

              <Flame className="absolute -bottom-4 -left-4 w-32 h-32 text-white/10" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Compass className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    الورد اليومي الذكي
                  </h3>
                  <p className="text-sm text-slate-500">
                    يتكيف مع قراءتك السابقة لتصل لهدفك
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                  هدف اليوم بناءً على سرعة قراءتك
                </p>

                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-500">
                  {progress?.dailyGoalVerses || 50}{" "}
                  <span className="text-lg text-slate-500">آية</span>
                </div>

                <button
                  onClick={openLastReadingPosition}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl w-full transition shadow-sm flex justify-center items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  بدء تلاوة الورد
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <Zap className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    التحديات الأسبوعية
                  </h3>
                  <p className="text-sm text-slate-500">
                    شارك في التحديات لتسريع الختمة
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "weekly_surah_kahf",
                    title: "اقرأ سورة الكهف",
                    current: progress?.completedChallengeIds?.includes("weekly_surah_kahf") ? 1 : 0,
                    target: 1,
                    reward: 50,
                    action: () => onNavigateToReader(18, 1),
                  },
                  {
                    id: "read_500_ayahs",
                    title: "تلاوة 500 آية",
                    current: progress?.completedChallengeIds?.includes("read_500_ayahs")
                      ? 500
                      : Math.min(500, progress?.totalVersesRead || 0),
                    target: 500,
                    reward: 200,
                    action: openLastReadingPosition,
                  },
                ].map((challenge) => {
                  const isCompleted = challenge.current >= challenge.target;
                  return (
                  <div
                    key={challenge.id}
                    onClick={challenge.action}
                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-emerald-300 transition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {challenge.title}
                      </span>
                      {isCompleted ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> مكتمل</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-md">
                          +{challenge.reward} نقطة
                        </span>
                      )}
                    </div>

                    <div
                      className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden"
                      dir="ltr"
                    >
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (challenge.current / challenge.target) * 100
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="text-right mt-1" dir="ltr">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {challenge.current} / {challenge.target}
                      </span>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "favorites" && (
        <div className="animate-in fade-in duration-500">
          <BookmarksTab
            currentUser={currentUser}
            onRefreshStats={onRefreshStats}
            onNavigateToReader={onNavigateToReader}
          />
        </div>
      )}

      {activeTab === "plans" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-500">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              خطط الحفظ والمراجعة الذكية
            </h3>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed">
              <BookMarked className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">لا توجد خطط حفظ بعد</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">
                ابدأ بإنشاء خطة حفظ مخصصة، وسنساعدك على متابعة وردك ومراجعتك بانتظام.
              </p>
              <button
                onClick={() => onNavigateToTab("memorization")}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-sm mx-auto text-sm">
                <Plus className="h-4 w-4" />
                إنشاء خطة حفظ جديدة
              </button>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-950"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    {plan.title}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {plan.surahName} - آيات {plan.startVerse} إلى{" "}
                    {plan.endVerse}
                  </div>
                </div>

                <button
                  onClick={() => onStartMemorizeSession(plan)}
                  className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg hover:bg-emerald-200 transition text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <RefreshCw className="w-4 h-4" />
                  مراجعة الآن
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Daily Challenge Hero */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg"><Goal className="h-5 w-5 text-emerald-600"/>تحدي اليوم</h3>
                <p className="text-sm text-slate-500 mt-1">خطوات صغيرة اليوم تصنع أثرًا ثابتًا في رحلتك مع القرآن</p>
              </div>
              {allDailyTasksCompleted && (
                <div className="p-2 px-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-center font-bold text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4"/>
                  أحسنت! أتممت أثر اليوم 🌿
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dailyTasks.map(task => (
                <div key={task.id} onClick={task.action} className={`p-4 rounded-xl space-y-3 cursor-pointer transition-all duration-200 ${task.isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50' : 'bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 hover:border-emerald-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${task.isCompleted ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-500'}`}><task.icon className="h-5 w-5"/></div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${task.isCompleted ? 'bg-white dark:bg-slate-800 text-emerald-600' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                      {task.isCompleted ? 'مكتمل' : 'قيد التقدم'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{task.title}</p>
                    <p className="text-[11px] text-slate-400 h-8">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Faith Tree & Daily Points */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 text-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">رصيد أثر اليوم</h3>
                <p className="text-[10px] text-slate-400 mb-3">أكمل مهام اليوم لتحصل على مكافأة الإنجاز</p>
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className="text-blue-500" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${(dailyScore/DAILY_SCORE_TARGET)*100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                  </svg>
                  <div className="absolute text-2xl font-black text-blue-600 dark:text-blue-400">{dailyScore}</div>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2">من {DAILY_SCORE_TARGET} نقطة</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 text-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">شجرة الإنجاز الإيمانية</h3>
                <p className="text-[10px] text-slate-400 mb-3">رصيد الأثر الكلي: {points} نقطة</p>
                <div className="text-7xl my-3 transition-transform duration-500 hover:scale-110">{currentTreeStage.icon}</div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">مستواك الحالي: {currentTreeStage.name}</p>
                {nextTreeStage && (
                  <div className="max-w-xs mx-auto mt-2">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                      <span>التقدم للمستوى التالي</span>
                      <span>{Math.round(treeProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden" dir="ltr">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${treeProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
              <h3 className="font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2"><Award className="h-5 w-5 text-blue-500"/>الأوسمة والإنجازات</h3>
              <p className="text-xs text-slate-500 mb-4">إنجازاتك في رحلة القرآن</p>
              {Object.entries(badges).map(([category, badgeList]) => (
                <div key={category} className="mb-5">
                  <h4 className="text-xs font-bold text-slate-400 mb-3 capitalize">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {badgeList.map(badge => {
                      const isEarned = badge.current >= badge.target;
                      const progressPercent = Math.min(100, (badge.current / badge.target) * 100);
                      const isInProgress = !isEarned && progressPercent > 0;
                      return (
                        <div key={badge.id} className={`p-3 rounded-xl border ${isEarned ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50' : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800' }`}>
                          <div className="flex items-start justify-between">
                            <div className={`p-2 rounded-lg ${isEarned ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600' : isInProgress ? 'bg-amber-100 dark:bg-amber-900 text-amber-600' : 'bg-white dark:bg-slate-800 text-slate-400 opacity-70'}`}>
                              <span className={`text-2xl ${!isEarned && 'grayscale'}`}>{badge.icon}</span>
                            </div>
                            {isEarned && <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-emerald-600">تم فتح الوسام</div>}
                            {isInProgress && <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-amber-600">قيد التقدم</div>}
                            {!isEarned && !isInProgress && <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-500">لم يتحقق بعد</div>}
                          </div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-2">{badge.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 h-5">{isEarned ? ' ' : badge.requirement}</p>
                          {isInProgress && (
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-1 overflow-hidden" dir="ltr">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Challenges */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500"/>تحديات أسبوعية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyChallenges.map(challenge => {
                const isCompleted = challenge.current >= challenge.target;
                return (
                  <div key={challenge.id} onClick={challenge.action} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-emerald-300 transition">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">{challenge.title}</span>
                      {isCompleted ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> مكتمل</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-md">+{challenge.reward} نقطة</span>
                      )}
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden" dir="ltr">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (challenge.current / challenge.target) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}