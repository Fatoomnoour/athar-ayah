import React, { useState, useEffect } from "react";
import { 
  BookOpen, Trophy, Plus, Target, CheckCircle, ChevronLeft, 
  BookMarked, Compass, Calendar, Sparkles, Award 
} from "lucide-react";
import { ReadingProgress, User } from "../types";
import { SURAHS } from "../data/surahs";

interface ProgressTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
}

export default function ProgressTab({ currentUser, onRefreshStats }: ProgressTabProps) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local state for updating
  const [selectedSurahId, setSelectedSurahId] = useState(1);
  const [verseNumber, setVerseNumber] = useState(1);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchProgress();
  }, [currentUser]);

  const fetchProgress = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || "kidscodinghub1512@gmail.com";
      const res = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        setSelectedSurahId(data.lastSurahId);
        setVerseNumber(data.lastVerseNumber);
        setDailyGoal(data.dailyGoalVerses || 10);
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSurahMeta = SURAHS.find(s => s.id === selectedSurahId);

  // Auto-adjust verse limits when surah changes
  useEffect(() => {
    if (activeSurahMeta && verseNumber > activeSurahMeta.versesCount) {
      setVerseNumber(1);
    }
  }, [selectedSurahId]);

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMsg("");

    const surahName = activeSurahMeta?.name || "الفاتحة";
    const userId = currentUser?.id || "kidscodinghub1512@gmail.com";

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lastSurahId: selectedSurahId,
          lastSurahName: surahName,
          lastVerseNumber: verseNumber,
          dailyGoalVerses: dailyGoal
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        setMsg("تم تحديث تقدم القراءة بنجاح! طاب يومك بذكر الله.");
        onRefreshStats();
        setTimeout(() => setMsg(""), 3500);
      }
    } catch (err) {
      setMsg("حدث خطأ أثناء تحديث تقدم القراءة.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSurahCompleted = async (surahId: number) => {
    if (!progress) return;
    const isCompleted = progress.completedSurahs.includes(surahId);
    let updatedList = [...progress.completedSurahs];

    if (isCompleted) {
      updatedList = updatedList.filter(id => id !== surahId);
    } else {
      updatedList.push(surahId);
    }

    const userId = currentUser?.id || "kidscodinghub1512@gmail.com";

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          completedSurahs: updatedList
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        onRefreshStats();
      }
    } catch (err) {
      console.error("Error toggling surah completion:", err);
    }
  };

  // Calculations for pretty cards
  const totalQuranVerses = 6236;
  const completedSurahsCount = progress?.completedSurahs.length || 0;
  const totalSurahsCount = 114;
  const surahProgressPercentage = Math.round((completedSurahsCount / totalSurahsCount) * 100);

  // Estimate remaining days to complete the Quran based on goal
  const remainingVerses = totalQuranVerses - (progress ? (SURAHS.filter(s => progress.completedSurahs.includes(s.id)).reduce((acc, s) => acc + s.versesCount, 0)) : 0);
  const estimatedDaysToComplete = progress ? Math.round(remainingVerses / progress.dailyGoalVerses) : 623;

  return (
    <div className="space-y-6">
      {/* Header and Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current status card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute left-[-20px] top-[-20px] opacity-10 font-serif text-8xl select-none">القرآن</div>
          <div>
            <span className="text-emerald-100 text-xs font-semibold px-2 py-0.5 bg-emerald-700/50 rounded-full inline-block mb-2">آخر موضع قراءة</span>
            <h3 className="text-2xl font-bold leading-tight">
              {progress ? `${progress.lastSurahName} • آية ${progress.lastVerseNumber}` : "الفاتحة • آية 1"}
            </h3>
            <p className="text-emerald-100 text-xs mt-1.5 flex items-center gap-1">
              <Compass className="h-3 w-3" /> ثبتت قراءتك ونوّر يومك بالقرآن.
            </p>
          </div>
          
          <div className="mt-6 pt-3 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-100">
            <span>تحديث: {progress ? new Date(progress.updatedAt).toLocaleDateString("ar-SA") : "اليوم"}</span>
            <BookMarked className="h-4.5 w-4.5 text-emerald-200" />
          </div>
        </div>

        {/* Goal card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-semibold block">هدفك اليومي</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {progress?.dailyGoalVerses || 10} <span className="text-sm font-normal text-slate-500">آية / يومياً</span>
              </h4>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl">
              <Target className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>تقدير الختم بالورد الحالي</span>
              <span className="font-semibold text-teal-600">~ {estimatedDaysToComplete} يوم</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(10, (10 / (progress?.dailyGoalVerses || 10)) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Progress Tracker Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-semibold block">السور المكتملة</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {completedSurahsCount} <span className="text-sm font-normal text-slate-500">سورة من ١١٤</span>
              </h4>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
              <Trophy className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>إجمالي نسبة ختم السور</span>
              <span className="font-semibold text-amber-600">{surahProgressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${surahProgressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Update progress form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2 text-md">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <span>تسجيل الموضع الحالي للقراءة</span>
          </h3>

          {msg && (
            <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProgress} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">السورة الحالية</label>
              <select
                value={selectedSurahId}
                onChange={(e) => setSelectedSurahId(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="progress-surah-select"
              >
                {SURAHS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name} ({s.versesCount} آية)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                وصلت للآية رقم (الحد الأقصى {activeSurahMeta?.versesCount || 286})
              </label>
              <input
                type="number"
                min={1}
                max={activeSurahMeta?.versesCount || 286}
                value={verseNumber}
                onChange={(e) => setVerseNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="progress-verse-input"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>الورد اليومي المستهدف</span>
                <span className="text-emerald-600">{dailyGoal} آية / يومياً</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                id="progress-goal-range"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 mt-2"
              id="update-progress-submit"
            >
              {isUpdating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span>حفظ التقدم ومتابعة الورد</span>
              )}
            </button>
          </form>
        </div>

        {/* Completed Surahs list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[500px]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-md">
              <Award className="h-5 w-5 text-amber-500" />
              <span>قائمة ختم السور الكريمة</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md">
              اضغط على السورة لتسجيل ختمتها
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto flex-1 pr-1">
            {SURAHS.map((s) => {
              const isCompleted = progress?.completedSurahs.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => handleToggleSurahCompleted(s.id)}
                  className={`p-3 rounded-xl border text-right transition flex items-center justify-between cursor-pointer group ${
                    isCompleted 
                      ? "border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300" 
                      : "border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-900/40 hover:dark:bg-slate-850 text-slate-700 dark:text-slate-300"
                  }`}
                  id={`toggle-surah-${s.id}`}
                >
                  <div className="space-y-0.5">
                    <span className="block text-[11px] text-slate-400 font-semibold">
                      {s.id}. {s.type === "Meccan" ? "مكية" : "مدنية"}
                    </span>
                    <span className="font-bold text-sm block group-hover:translate-x-[-2px] transition-transform">
                      {s.name}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {s.versesCount} آية
                    </span>
                  </div>
                  <div>
                    <CheckCircle 
                      className={`h-5 w-5 transition ${
                        isCompleted 
                          ? "text-emerald-600 fill-emerald-100 dark:fill-emerald-950" 
                          : "text-slate-300 dark:text-slate-700 group-hover:scale-110"
                      }`} 
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
