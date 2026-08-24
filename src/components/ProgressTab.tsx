import React, { useState, useEffect } from "react";
import { 
  BookOpen, Trophy, Plus, Target, CheckCircle, ChevronLeft, 
  BookMarked, Compass, Calendar, Sparkles, Award 
} from "lucide-react";
import { ReadingProgress, User } from "../types";
import { getReadingProgress, saveReadingProgress } from "../services/firestoreService";
import { formatFirestoreDate } from "../utils/dateUtils";
import { SURAH_LIST as SURAHS, SURAH_VERSE_COUNTS } from "../utils/quranUtils";
import { useLanguage } from "../i18n";

interface ProgressTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
  onNavigateToReader: (surahId?: number, verseNum?: number) => void;
}

export default function ProgressTab({ currentUser, onRefreshStats, onNavigateToReader }: ProgressTabProps) {
  const { language, t } = useLanguage();
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
      if (!currentUser) return;
      const data = await getReadingProgress(currentUser.id);
      if (data) {
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
    if (activeSurahMeta && verseNumber > activeSurahMeta.verses) {
      setVerseNumber(1);
    }
  }, [selectedSurahId]);

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdating(true);
    setMsg("");

    const surahName = activeSurahMeta?.name || "الفاتحة";

    try {
      await saveReadingProgress(currentUser.id, {
        lastSurahId: selectedSurahId,
        lastSurahName: surahName,
        lastVerseNumber: verseNumber,
        dailyGoalVerses: dailyGoal
      });
      
      // Update local state directly to be responsive
      if (progress) {
        setProgress({
          ...progress,
          lastSurahId: selectedSurahId,
          lastSurahName: surahName,
          lastVerseNumber: verseNumber,
          dailyGoalVerses: dailyGoal
        });
      }

      setMsg("تم تحديث تقدم القراءة بنجاح! طاب يومك بذكر الله.");
      onRefreshStats();
      setTimeout(() => setMsg(""), 3500);
    } catch (err) {
      setMsg("حدث خطأ أثناء تحديث تقدم القراءة.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSurahCompleted = async (surahId: number) => {
    if (!progress || !currentUser) return;
    const isCompleted = progress.completedSurahs.includes(surahId);
    let updatedList = [...progress.completedSurahs];

    if (isCompleted) {
      updatedList = updatedList.filter(id => id !== surahId);
    } else {
      updatedList.push(surahId);
    }

    try {
      await saveReadingProgress(currentUser.id, {
        completedSurahs: updatedList
      });

      // Update local state
      setProgress({
        ...progress,
        completedSurahs: updatedList
      });
      onRefreshStats();
    } catch (err) {
      console.error("Error toggling surah completion:", err);
    }
  };

  // Calculations use the same canonical metadata as the Quran reader.
  const totalQuranVerses = SURAH_VERSE_COUNTS.reduce((total, count) => total + count, 0);
  const completedSurahIds = progress?.completedSurahs ?? [];
  const completedSurahsCount = completedSurahIds.length;
  const totalSurahsCount = SURAHS.length;
  const surahProgressPercentage = totalSurahsCount > 0
    ? Math.round((completedSurahsCount / totalSurahsCount) * 100)
    : 0;

  // Never divide by zero or render NaN/Infinity when there is no saved goal.
  const completedVerses = completedSurahIds.reduce((total, surahId) => {
    const surah = SURAHS.find((item) => item.id === surahId);
    return total + (surah?.verses ?? 0);
  }, 0);
  const remainingVerses = Math.max(0, totalQuranVerses - completedVerses);
  const safeDailyGoal = Number.isFinite(progress?.dailyGoalVerses) && (progress?.dailyGoalVerses ?? 0) > 0
    ? progress!.dailyGoalVerses
    : 0;
  const estimatedDaysToComplete = safeDailyGoal > 0 && remainingVerses > 0
    ? Math.ceil(remainingVerses / safeDailyGoal)
    : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => onNavigateToReader(progress?.lastSurahId, progress?.lastVerseNumber)}
        disabled={!progress?.lastSurahId || !progress?.lastVerseNumber}
        className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-right flex items-center justify-between group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="font-bold text-emerald-700 dark:text-emerald-400">
          {progress?.lastSurahId && progress?.lastVerseNumber
            ? `${t("continueFromLast")} ${progress.lastSurahName} ${t("verseUnit")} ${progress.lastVerseNumber}`
            : t("noProgressData")}
        </span>
        <ChevronLeft className="h-5 w-5 text-emerald-500 group-hover:translate-x-[-4px] transition-transform" />
      </button>

      {/* Header and Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current status card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute left-[-20px] top-[-20px] opacity-10 font-serif text-8xl select-none">{t("quranWord")}</div>
          <div>
            <span className="text-emerald-100 text-xs font-semibold px-2 py-0.5 bg-emerald-700/50 rounded-full inline-block mb-2">{t("lastReadPosition")}</span>
              <h3 className="text-2xl font-bold leading-tight">
              {progress?.lastSurahId && progress?.lastVerseNumber
                ? `${progress.lastSurahName} • ${t("verseUnit")} ${progress.lastVerseNumber}`
                : t("noProgressData")}
            </h3>
            <p className="text-emerald-100 text-xs mt-1.5 flex items-center gap-1">
              <Compass className="h-3 w-3" /> {t("updateProgressMsg")}
            </p>
          </div>
          
          <div className="mt-6 pt-3 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-100">
            <span>{t("lastUpdate")} {progress?.updatedAt ? formatFirestoreDate(progress.updatedAt) : t("notSpecified")}</span>
            <BookMarked className="h-4.5 w-4.5 text-emerald-200" />
          </div>
        </div>

        {/* Goal card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-semibold block">{t("dailyGoal")}</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {progress?.dailyGoalVerses || 10} <span className="text-sm font-normal text-slate-500">{t("dailyGoalUnit")}</span>
              </h4>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl">
              <Target className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{t("estimatedDays")}</span>
                <span className="font-semibold text-teal-600">
                  {estimatedDaysToComplete > 0 ? `~ ${estimatedDaysToComplete} ${t("daysUnit")}` : t("noProgressData")}
                </span>
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
              <span className="text-slate-400 text-xs font-semibold block">{t("completedSurahsCount")}</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {completedSurahsCount} <span className="text-sm font-normal text-slate-500">{t("outOf114")}</span>
              </h4>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
              <Trophy className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{t("totalSurahProgress")}</span>
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
            <span>{t("updateProgressTitle")}</span>
          </h3>

          {msg && (
            <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProgress} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t("currentSurahLabel")}</label>
              <select
                value={selectedSurahId}
                onChange={(e) => setSelectedSurahId(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="progress-surah-select"
              >
                {SURAHS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name} ({s.verses} {t("verseUnit")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1" >
                {t("reachedVerseLabel")} ({activeSurahMeta?.verses || 286} {t("verseUnit")})
              </label>
              <input
                type="number"
                min={1}
                max={activeSurahMeta?.verses || 286}
                value={verseNumber}
                onChange={(e) => setVerseNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="progress-verse-input"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>{t("dailyGoalTarget")}</span>
                <span className="text-emerald-600">{dailyGoal} {t("dailyGoalUnit")}</span>
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
                <span>{t("saveProgress")}</span>
              )}
            </button>
          </form>
        </div>

        {/* Completed Surahs list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col h-[500px]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-md">
              <Award className="h-5 w-5 text-amber-500" />
              <span>{t("completedSurahsList")}</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md">
              {t("clickToComplete")}
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
                      {s.id}. {s.type}
                    </span>
                    <span className="font-bold text-sm block group-hover:translate-x-[-2px] transition-transform">
                      {s.name}
                    </span>
                    <span className="block text-[10px] text-slate-400" >
                      {s.verses} آية
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
