import React, { useState, useEffect } from "react";
import { 
  Award, BookOpen, Calendar, CheckCircle2, ChevronLeft, 
  Clock, Flame, HelpCircle, LayoutDashboard, RefreshCw, Star, Play 
} from "lucide-react";
import { SURAH_LIST } from "../utils/quranUtils";
import { User, MemorizationPlan, ReadingProgress } from "../types";

interface ProgressPageProps {
  currentUser: User | null;
  onStartMemorizeSession: (plan: MemorizationPlan) => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  onRefreshStats: () => void;
}

export default function ProgressPage({
  currentUser,
  onStartMemorizeSession,
  onShowToast,
  onRefreshStats
}: ProgressPageProps) {
  const [plans, setPlans] = useState<MemorizationPlan[]>([]);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter tabs for Memorization Plans: "all" | "active" | "completed" | "revision_due"
  const [planFilter, setPlanFilter] = useState<"all" | "active" | "completed" | "revision_due">("all");

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [resPlans, resProgress] = await Promise.all([
        fetch(`/api/memorization?userId=${encodeURIComponent(currentUser.id)}`),
        fetch(`/api/progress?userId=${encodeURIComponent(currentUser.id)}`)
      ]);

      if (resPlans.ok) {
        setPlans(await resPlans.json());
      }
      if (resProgress.ok) {
        setProgress(await resProgress.json());
      }
    } catch (err) {
      console.error(err);
      onShowToast("عذراً، فشل تحميل تقارير التقدم من الخادم.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePlanComplete = async (planId: string, currentCompleted: boolean) => {
    try {
      const res = await fetch(`/api/memorization/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted })
      });

      if (res.ok) {
        onShowToast(!currentCompleted ? "تهانينا! تم وسم الخطة كمكتملة 🎉" : "تم إلغاء اكتمال الخطة", "success");
        fetchData();
        onRefreshStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute stats metrics
  const completedSurahsCount = progress?.completedSurahs?.length || 0;
  const activePlans = plans.filter((p) => !p.completed);
  const completedPlans = plans.filter((p) => p.completed);

  // Check if a plan is due for Spaced Revision today
  const isPlanDueForRevision = (plan: MemorizationPlan) => {
    if (plan.completed) return false;
    if (!plan.nextReviewDate) return false;
    
    const today = new Date().toISOString().split("T")[0];
    return plan.nextReviewDate <= today;
  };

  const revisionDuePlans = plans.filter(isPlanDueForRevision);

  const getFilteredPlans = () => {
    switch (planFilter) {
      case "active": return activePlans;
      case "completed": return completedPlans;
      case "revision_due": return revisionDuePlans;
      default: return plans;
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="text-sm text-slate-400">جاري تحميل لوحة الإنجاز...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Completed Surahs Tracker */}
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-slate-900 dark:to-slate-950 border border-emerald-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">ختم السور الكريمة</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{completedSurahsCount} <span className="text-xs text-slate-400 font-medium">/ ١١٤ سورة</span></span>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(3, (completedSurahsCount / 114) * 100)}%` }}
              ></div>
            </div>
          </div>
          <span className="block text-[10px] text-slate-400 leading-tight">اضغط على تبويب "ورد التلاوة" لتعديل السور المنجزة.</span>
        </div>

        {/* Spaced Revision Due Metric */}
        <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-slate-900 dark:to-slate-950 border border-amber-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">مراجعات متباعدة مستحقة اليوم</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              {revisionDuePlans.length} <span className="text-xs text-slate-400 font-medium">مواضع مطلوبة مراجعتها</span>
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              وفقاً لمنحنى النسيان لجدولة الحفظ، يجب مراجعة هذه المواضع لضمان تثبيتها في الذاكرة طويلة المدى.
            </p>
          </div>
        </div>

        {/* Daily Tasks / Streak */}
        <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/40 dark:from-slate-900 dark:to-slate-950 border border-purple-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">شريط اليوم وسلسلة المواظبة</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <Flame className="h-5 w-5 animate-pulse text-amber-500" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              {progress?.currentStreak || 0} <span className="text-xs text-slate-400 font-medium">أيام متصلة</span>
            </span>
            <div className="mt-3 bg-white/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-purple-100/50 dark:border-slate-700/50">
              <span className="block text-[10px] text-slate-500 font-bold mb-2">٢ من ٣ مهام أُنجزت اليوم</span>
              <div className="flex gap-2 justify-between">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full h-1.5 bg-emerald-500 rounded-full shadow-xs"></div>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold">قراءة</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full h-1.5 bg-emerald-500 rounded-full shadow-xs"></div>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold">حفظ</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <span className="text-[9px] text-slate-400 font-bold">تدبر</span>
                </div>
              </div>
            </div>
            {progress?.currentStreak === 0 && (
              <p className="text-[10px] text-slate-500 mt-2 text-center">نبدأ اليوم من جديد بفضل الله ✨</p>
            )}
          </div>
        </div>
      </div>

      {/* Athar Garden Visualization */}
      <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5 shadow-sm overflow-hidden relative">
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400">حديقة الأثر</h3>
          <span className="text-[10px] text-slate-500 font-bold bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">تزدهر الحديقة بزيادة مواظبتك</span>
        </div>
        <div className="h-32 flex items-end justify-around pb-2 relative z-10">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => {
            // Mock growth based on points
            const points = progress?.points || 0;
            const growthLevel = Math.min(5, Math.floor(points / (i * 15)));
            const isGrown = growthLevel > 0;
            
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`transition-all duration-1000 transform ${isGrown ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                  <div className="text-2xl sm:text-4xl" style={{ transform: `scale(${0.5 + (growthLevel * 0.15)})` }}>
                    {growthLevel === 1 ? "🌱" : growthLevel === 2 ? "🌿" : growthLevel === 3 ? "🌸" : growthLevel === 4 ? "✨" : "🍎"}
                  </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            );
          })}
        </div>
        {/* Background decorative curve */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-emerald-50 dark:from-emerald-900/10 to-transparent" />
      </div>

      {/* Main Grid: Plans (8 Cols) & Calendar schedule (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Plans list */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <h3 className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
              <Award className="h-5 w-5" />
              <span>خطط ومستويات الحفظ الحالية</span>
            </h3>

            {/* Filter selectors */}
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border gap-1">
              <button
                onClick={() => setPlanFilter("all")}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg ${planFilter === "all" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
              >
                الكل
              </button>
              <button
                onClick={() => setPlanFilter("active")}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg ${planFilter === "active" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
              >
                النشطة ({activePlans.length})
              </button>
              <button
                onClick={() => setPlanFilter("revision_due")}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg ${planFilter === "revision_due" ? "bg-amber-500 text-white" : "text-slate-400"}`}
              >
                مستحقة المراجعة ({revisionDuePlans.length})
              </button>
              <button
                onClick={() => setPlanFilter("completed")}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg ${planFilter === "completed" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
              >
                المكتملة
              </button>
            </div>
          </div>

          {/* List of plans */}
          {getFilteredPlans().length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-dashed border-slate-200/50">
              {planFilter === "revision_due" 
                ? "الحمد لله، لا يوجد أي مواضع مستحقة المراجعة العاجلة اليوم!" 
                : "لا توجد خطط حفظ مطابقة للتصنيف المختار حالياً."}
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredPlans().map((plan) => {
                const isDue = isPlanDueForRevision(plan);
                return (
                  <div 
                    key={plan.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isDue 
                        ? "bg-amber-500/5 border-amber-300 dark:border-amber-900/60" 
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 dark:text-white">{plan.title}</span>
                        {plan.completed ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[8px] rounded-md font-black">مكتمل ✓</span>
                        ) : isDue ? (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] rounded-md font-black animate-pulse">⏰ مستحق المراجعة اليوم</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 text-[8px] rounded-md font-black">نشط</span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400">
                        الآيات: من {plan.startVerse} إلى {plan.endVerse} من سورة {plan.surahName}
                      </p>

                      {plan.nextReviewDate && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>تاريخ المراجعة المتباعدة: {plan.nextReviewDate} ({plan.intervalDays || 1} يوم)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Interactive Hifz Session Launcher */}
                      {!plan.completed && (
                        <button
                          onClick={() => onStartMemorizeSession(plan)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl shadow-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-white" />
                          <span>جلسة مراجعة ذكية</span>
                        </button>
                      )}

                      {/* Complete toggle */}
                      <button
                        onClick={() => handleTogglePlanComplete(plan.id, plan.completed)}
                        className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition cursor-pointer ${
                          plan.completed 
                            ? "bg-slate-50 hover:bg-slate-100 text-slate-500" 
                            : "bg-white dark:bg-slate-900 text-emerald-600 hover:bg-emerald-50/20"
                        }`}
                      >
                        {plan.completed ? "وسم كغير مكتمل" : "وسم كمكتمل"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Spaced Revision Calendar info panel */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border space-y-4">
          <h3 className="text-sm font-black text-emerald-600 flex items-center gap-1.5 border-b pb-3">
            <Calendar className="h-5 w-5" />
            <span>روزنامة التكرار المتباعد</span>
          </h3>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            تعتمد الجدولة المتباعدة على قياس جودة استذكار الموضع وتكرار تلاوته بالتدريج في فترات متباعدة لتخزينه بالذاكرة العميقة.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-rose-500/5 rounded-xl border border-rose-100 dark:border-rose-950/40">
              <span className="block text-[10px] font-bold text-rose-600 leading-none mb-1">🔴 مراجعة تكرارية (يوم):</span>
              <p className="text-[9px] text-slate-400 leading-tight">للمواضع الصعبة جداً أو حديثة الحفظ لضمان عدم تلاشي البصمة العصبية.</p>
            </div>

            <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-100 dark:border-amber-950/40">
              <span className="block text-[10px] font-bold text-amber-600 leading-none mb-1">🟡 مراجعة متوسطة (٣ أيام):</span>
              <p className="text-[9px] text-slate-400 leading-tight">للمواضع متوسطة التمكين لرفع مستوى استذكارها التلقائي.</p>
            </div>

            <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-950/40">
              <span className="block text-[10px] font-bold text-emerald-600 leading-none mb-1">🟢 مراجعة متباعدة (٧ أيام):</span>
              <p className="text-[9px] text-slate-400 leading-tight">للمواضع السهلة والمستقرة لتجنب تشتتها من الذاكرة.</p>
            </div>

            <div className="p-3.5 bg-purple-500/5 rounded-xl border border-purple-100 dark:border-purple-950/40">
              <span className="block text-[10px] font-bold text-purple-600 leading-none mb-1">🟣 مراجعة راسخة (١٤ - ٣٠ يوماً):</span>
              <p className="text-[9px] text-slate-400 leading-tight">للمواضع المتقنة تماماً (الصم) لمراجعتها دورياً لضمان عدم ضياع التمكين.</p>
            </div>
          </div>
          
          <h3 className="text-sm font-black text-emerald-600 flex items-center gap-1.5 border-b pb-3 mt-6">
            <Star className="h-5 w-5 text-amber-400" />
            <span>المهام اليومية والأوسمة</span>
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">أكمل وردك اليومي ({progress?.dailyGoalVerses || 10} آيات)</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded font-bold">+10 نقاط</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">اكتب خاطرة تدبرية</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded font-bold">+5 نقاط</span>
            </div>
            {progress?.badges?.map((badge, idx) => (
              <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">🏅 وسام: {badge}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
