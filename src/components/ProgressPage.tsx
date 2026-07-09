import React, { useState, useEffect } from "react";
import {
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
  RefreshCw,
  Play,
  Share2,
  Target,
  BarChart2,
  TrendingUp,
  Compass,
  ChevronRight,
  Zap,
} from "lucide-react";

import {
  getReadingProgress,
  getUserMemorizationPlans,
} from "../services/firestoreService";

import { SURAH_LIST } from "../utils/quranUtils";
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
}

export default function ProgressPage({
  currentUser,
  onStartMemorizeSession,
  onShowToast,
  onRefreshStats,
  onNavigateToReader,
}: ProgressPageProps) {
  const [plans, setPlans] = useState<MemorizationPlan[]>([]);
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
      const [plansData, progressData] = await Promise.all([
        getUserMemorizationPlans(currentUser.id),
        getReadingProgress(currentUser.id),
      ]);

      setPlans(plansData || []);
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

  const completedSurahsCount = progress?.completedSurahs?.length || 0;
  const growthLevel =
    progress?.treeLevel ||
    Math.min(5, Math.max(1, Math.floor(completedSurahsCount / 20) + 1));
  const khatmahPercentage =
    progress?.khatmahPercentage || ((progress?.totalVersesRead || 0) / 6236) * 100;
  const hoursRead = Math.floor((progress?.totalReadTimeMinutes || 0) / 60);
  const minsRead = (progress?.totalReadTimeMinutes || 0) % 60;

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
          {/* PHASE 1: Hero Action Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-right">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">أكمل أثر اليوم</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                ابدأ بخطوة صغيرة اليوم، واقرأ وردك وتدبر آياتك وراجع حفظك.
              </p>
            </div>
            <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4 p-4 md:p-0 bg-slate-50 dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-slate-100 dark:border-slate-800">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-slate-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  ></path>
                  <path
                    className="text-emerald-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="0, 100" // Placeholder for daily progress
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  ></path>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">0</span>
                  <span className="text-xs text-slate-400">/ {progress?.dailyGoalVerses || 50}</span>
                </div>
              </div>
              <div className="text-center md:text-right">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">وردك اليومي</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">تابع قراءة الآيات المستهدفة لليوم.</p>
                <button
                  onClick={openLastReadingPosition}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>تابع من آخر موضع</span>
                </button>
              </div>
            </div>
          </div>

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
                    id: 1,
                    title: "اقرأ سورة الكهف",
                    current: 0,
                    target: 1,
                    reward: 50,
                    action: () => onNavigateToReader(18, 1),
                  },
                  {
                    id: 2,
                    title: "تلاوة 500 آية",
                    current: Math.min(500, progress?.totalVersesRead || 0),
                    target: 500,
                    reward: 200,
                    action: openLastReadingPosition,
                  },
                ].map((challenge) => (
                  <div
                    key={challenge.id}
                    onClick={challenge.action}
                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-emerald-300 transition"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {challenge.title}
                      </span>
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-md">
                        +{challenge.reward} نقطة
                      </span>
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
                ))}
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
              المراجعة الذكية (Spaced Repetition)
            </h3>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              لا توجد خطط حفظ. ابدأ بإضافة خطة جديدة!
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
          <div className="bg-gradient-to-b from-emerald-900 to-slate-900 rounded-3xl p-8 text-center relative overflow-hidden border border-slate-800">
            <h3 className="text-white font-bold text-2xl mb-2 relative z-10">
              شجرة الإنجاز الإيمانية
            </h3>
            <p className="text-emerald-200/70 text-sm mb-10 relative z-10">
              تنمو الشجرة مع استمرارك في التلاوة وزيادة نقاطك
            </p>

            <div className="flex justify-center items-end h-48 relative z-10">
              <div className="text-9xl transition-transform duration-1000 transform hover:scale-110 cursor-default">
                {growthLevel === 1
                  ? "🌱"
                  : growthLevel === 2
                  ? "🌿"
                  : growthLevel === 3
                  ? "🌳"
                  : growthLevel === 4
                  ? "🌸"
                  : "🍎"}
              </div>
            </div>

            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">
              الأوسمة والنياشين
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[
                { icon: "📖", title: "أول تلاوة", earned: true },
                {
                  icon: "🔥",
                  title: "مستمر ٧ أيام",
                  earned: (progress?.longestStreak || 0) >= 7,
                },
                {
                  icon: "🌟",
                  title: "ختم جزء كامل",
                  earned: (progress?.totalVersesRead || 0) >= 148,
                },
                {
                  icon: "👑",
                  title: "ختم القرآن",
                  earned: khatmahPercentage >= 100,
                },
                {
                  icon: "🎯",
                  title: "مراجعة متقنة",
                  earned: plans.some((p) => (p.revisionHistory?.length || 0) > 0),
                },
              ].map((badge, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border ${
                    badge.earned
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 grayscale opacity-50"
                  }`}
                >
                  <span className="text-4xl">{badge.icon}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {badge.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}