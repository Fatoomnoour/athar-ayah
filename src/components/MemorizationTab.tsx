import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, Check, Trash2, Award, BookOpen, AlertCircle, 
  TrendingUp, CheckCircle2, RefreshCw, Star, Trash, Sparkles
} from "lucide-react";
import { MemorizationPlan, User, RevisionSession } from "../types";
import { SURAHS } from "../data/surahs";
import SpacedRepetitionExplanation from "./SpacedRepetitionExplanation";

interface MemorizationTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
}

export default function MemorizationTab({ currentUser, onRefreshStats }: MemorizationTabProps) {
  const [plans, setPlans] = useState<MemorizationPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Plan form state
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedSurahId, setSelectedSurahId] = useState(78); // Default: An-Naba
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState(40);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Review Mode state
  const [reviewPlanId, setReviewPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [currentUser]);

  const fetchPlans = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/memorization?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const surahName = SURAHS.find(s => s.id === selectedSurahId)?.name || "";
      const res = await fetch("/api/memorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          title,
          surahId: selectedSurahId,
          surahName,
          startVerse,
          endVerse,
          targetDate: new Date().toISOString() // Not heavily used anymore, but kept for schema
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setTitle("");
        fetchPlans();
        onRefreshStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!currentUser || !confirm("هل أنت متأكد من حذف هذه الخطة؟")) return;
    try {
      const res = await fetch(`/api/memorization/${planId}?userId=${encodeURIComponent(currentUser.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPlans();
        onRefreshStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewScore = async (planId: string, rating: "hard" | "medium" | "easy" | "mastered") => {
    if (!currentUser) return;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    let nextInterval = 1;
    if (rating === "medium") nextInterval = 3;
    if (rating === "easy") nextInterval = 7;
    if (rating === "mastered") nextInterval = plan.intervalDays && plan.intervalDays >= 15 ? 30 : 15;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

    try {
      const res = await fetch(`/api/memorization/${planId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          rating, // "excellent"|"good"|"weak" mapped internally or backend modified to accept these
          nextReviewDate: nextReviewDate.toISOString(),
          intervalDays: nextInterval
        }),
      });
      if (res.ok) {
        setReviewPlanId(null);
        fetchPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusCategories = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReviews: MemorizationPlan[] = [];
    const upcomingReviews: MemorizationPlan[] = [];
    const overdueReviews: MemorizationPlan[] = [];
    const masteredReviews: MemorizationPlan[] = [];

    plans.forEach(plan => {
      if (plan.intervalDays && plan.intervalDays >= 15) {
        masteredReviews.push(plan);
        return;
      }
      
      if (!plan.nextReviewDate) {
        todayReviews.push(plan);
        return;
      }

      const revDate = new Date(plan.nextReviewDate);
      revDate.setHours(0, 0, 0, 0);

      if (revDate < today) {
        overdueReviews.push(plan);
      } else if (revDate.getTime() === today.getTime()) {
        todayReviews.push(plan);
      } else {
        upcomingReviews.push(plan);
      }
    });

    return { todayReviews, upcomingReviews, overdueReviews, masteredReviews };
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold">جاري تحميل الخطط...</div>;
  }

  const categories = getStatusCategories();

  const renderPlanCard = (plan: MemorizationPlan) => (
    <div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200">{plan.title}</h4>
          <p className="text-xs text-slate-500 mt-1">سورة {plan.surahName} (الآيات {plan.startVerse} - {plan.endVerse})</p>
        </div>
        <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-red-500 transition">
          <Trash className="h-4 w-4" />
        </button>
      </div>
      
      {reviewPlanId === plan.id ? (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 animate-in fade-in">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center mb-2">كيف كان حفظك؟</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onClick={() => handleReviewScore(plan.id, "hard")} className="p-2 text-xs font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">صعب<span className="block text-[10px] font-normal opacity-70">غداً</span></button>
            <button onClick={() => handleReviewScore(plan.id, "medium")} className="p-2 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400">متوسط<span className="block text-[10px] font-normal opacity-70">بعد ٣ أيام</span></button>
            <button onClick={() => handleReviewScore(plan.id, "easy")} className="p-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400">جيد<span className="block text-[10px] font-normal opacity-70">بعد ٧ أيام</span></button>
            <button onClick={() => handleReviewScore(plan.id, "mastered")} className="p-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">متقن<span className="block text-[10px] font-normal opacity-70">١٥+ يوم</span></button>
          </div>
          <button onClick={() => setReviewPlanId(null)} className="w-full text-xs text-slate-400 hover:text-slate-600 mt-2">إلغاء</button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2">
          <div className="text-[10px] font-medium text-slate-400">
            {plan.nextReviewDate ? `المراجعة: ${new Date(plan.nextReviewDate).toLocaleDateString("ar-SA")}` : "بانتظار المراجعة الأولى"}
          </div>
          <button 
            onClick={() => setReviewPlanId(plan.id)}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition"
          >
            قيم المراجعة
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 font-sans" dir="rtl">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-600" />
            المراجعة والتكرار المتباعد
          </h2>
          <p className="text-sm text-slate-500 mt-1">راجع حفظك بذكاء لترسيخه في الذاكرة طويلة الأمد.</p>
        </div>
        <div className="flex items-center gap-3">
          <SpacedRepetitionExplanation />
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            أضف خطة حفظ
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleCreatePlan} className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">خطة حفظ جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">عنوان الخطة</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: سورة النبأ كاملة" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">السورة</label>
              <select value={selectedSurahId} onChange={e => setSelectedSurahId(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm">
                {SURAHS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">من الآية</label>
              <input type="number" min={1} value={startVerse} onChange={e => setStartVerse(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">إلى الآية</label>
              <input type="number" min={startVerse} value={endVerse} onChange={e => setEndVerse(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-sm">إلغاء</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2">{isSubmitting ? "جاري الحفظ..." : "حفظ وبدء المراجعة"}</button>
          </div>
        </form>
      )}

      {plans.length === 0 && !isAdding ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 dark:text-slate-300 mb-1">لا توجد خطط حفظ</h3>
          <p className="text-sm text-slate-400">أضف خطتك الأولى لتبدأ رحلة الحفظ المتقن.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.overdueReviews.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-red-600 mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> آيات متأخرة المراجعة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.overdueReviews.map(renderPlanCard)}
              </div>
            </div>
          )}

          {categories.todayReviews.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-emerald-600 mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> مراجعات اليوم</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.todayReviews.map(renderPlanCard)}
              </div>
            </div>
          )}

          {categories.upcomingReviews.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-amber-600 mb-4 flex items-center gap-2"><Calendar className="h-4 w-4"/> المراجعات القادمة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80">
                {categories.upcomingReviews.map(renderPlanCard)}
              </div>
            </div>
          )}

          {categories.masteredReviews.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-blue-600 mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4"/> مقاطع متقنة (مراجعة دورية)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
                {categories.masteredReviews.map(renderPlanCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
