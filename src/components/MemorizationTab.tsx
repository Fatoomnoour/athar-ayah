import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, Check, Trash2, Award, BookOpen, AlertCircle, 
  TrendingUp, CheckCircle2, RefreshCw, Star, Trash, Sparkles
} from "lucide-react";
import { MemorizationPlan, User, RevisionSession, QuranNote } from "../types";
import SpacedRepetitionExplanation from "./SpacedRepetitionExplanation";
import { formatFirestoreDate } from "../utils/dateUtils";
import { SURAH_LIST as SURAHS } from "../utils/quranUtils";
import { getUserMemorizationPlans, createMemorizationPlan, deleteMemorizationPlan, updateMemorizationPlan } from "../services/firestoreService";

interface MemorizationTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function MemorizationTab({ currentUser, onRefreshStats, onShowToast }: MemorizationTabProps) {
  const [plans, setPlans] = useState<MemorizationPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Plan form state
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedSurahId, setSelectedSurahId] = useState<number>(78); // Default: An-Naba
  const [startVerse, setStartVerse] = useState<number | string>(1);
  const [endVerse, setEndVerse] = useState<number | string>(SURAHS.find(s => s.id === 78)?.verses || 40);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Review Mode state
  const [reviewPlanId, setReviewPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [currentUser]);

  // Update end verse when surah changes
  useEffect(() => {
    const selectedSurah = SURAHS.find(s => s.id === selectedSurahId);
    setStartVerse(1);
    setEndVerse(selectedSurah?.verses || 1);
  }, [selectedSurahId]);

  const getSurahMaxVerse = (surahId: number) => {
    const surah = SURAHS.find(s => s.id === surahId);
    return surah ? surah.verses : 1;
  };

  const selectedSurahMaxVerse = getSurahMaxVerse(selectedSurahId);

  const fetchPlans = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userPlans = await getUserMemorizationPlans(currentUser.id);
      setPlans(userPlans);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !title.trim()) {
      onShowToast("يرجى إدخال عنوان للخطة.", "error");
      return;
    }

    const maxVerseForSelectedSurah = getSurahMaxVerse(selectedSurahId);
    const safeStartVerse = Math.max(1, Math.min(Number(startVerse), maxVerseForSelectedSurah));
    const safeEndVerse = Math.max(safeStartVerse, Math.min(Number(endVerse), maxVerseForSelectedSurah));

    if (Number(startVerse) !== safeStartVerse || Number(endVerse) !== safeEndVerse) {
      onShowToast(`عدد آيات سورة ${SURAHS.find(s => s.id === selectedSurahId)?.name} هو ${maxVerseForSelectedSurah} آية فقط. برجاء اختيار آيات من 1 إلى ${maxVerseForSelectedSurah}.`, "error");
      return;
    }

    if (safeStartVerse > safeEndVerse) {
      onShowToast("آية البداية لا يمكن أن تكون أكبر من آية النهاية.", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const surahName = SURAHS.find(s => s.id === selectedSurahId)?.name || "";

      await createMemorizationPlan(currentUser.id, {
        userId: currentUser.id,
        title,
        surahId: selectedSurahId,
        surahName,
        startVerse: Number(startVerse),
        endVerse: Number(endVerse),
        completed: false, // Plans are not completed upon creation
        intervalDays: 1, // Default interval
        nextReviewDate: new Date().toISOString()
      });

      setIsAdding(false);
      setTitle("");
      fetchPlans();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!currentUser || !confirm("هل أنت متأكد من حذف هذه الخطة؟")) return;
    try {
      await deleteMemorizationPlan(currentUser.id, planId);
      fetchPlans();
      onRefreshStats();
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
      await updateMemorizationPlan(currentUser.id, planId, {
        nextReviewDate: nextReviewDate.toISOString(),
        intervalDays: nextInterval,
        completed: rating === "mastered",
        revisionHistory: [
          ...(plan.revisionHistory || []),
          { date: new Date().toISOString(), rating }
        ]
      });
      setReviewPlanId(null);
      fetchPlans();
      onRefreshStats();
      onShowToast("تم التقييم وتحديث خطة المراجعة بنجاح", "success");
    } catch (err) {
      console.error(err);
      onShowToast("حدث خطأ أثناء حفظ التقييم", "error");
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

  const handleCorrectPlan = async (plan: MemorizationPlan) => {
    if (!currentUser) return;
    const maxVerseForPlanSurah = getSurahMaxVerse(plan.surahId);
    if (!maxVerseForPlanSurah) {
        onShowToast("لا يمكن تصحيح الخطة: عدد آيات السورة غير معروف.", "error");
        return;
    }

    const newStartVerse = Math.max(1, Math.min(plan.startVerse, maxVerseForPlanSurah));
    const newEndVerse = Math.max(newStartVerse, Math.min(plan.endVerse, maxVerseForPlanSurah));

    if (newStartVerse === plan.startVerse && newEndVerse === plan.endVerse) {
        onShowToast("الخطة صحيحة بالفعل أو تم تصحيحها مسبقاً.", "info");
        return;
    }

    try {
        await updateMemorizationPlan(currentUser.id, plan.id, { startVerse: newStartVerse, endVerse: newEndVerse });
        onShowToast("تم تصحيح نطاق الآيات في الخطة بنجاح.", "success");
        fetchPlans(); // Re-fetch to update UI
    } catch (err) {
        console.error("Error correcting plan:", err);
        onShowToast("فشل تصحيح الخطة.", "error");
    }
};

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 font-bold">جاري تحميل الخطط...</div>;
  }
  const categories = getStatusCategories();
  const renderPlanCard = (plan: MemorizationPlan) => {
    const maxVerseForPlanSurah = getSurahMaxVerse(plan.surahId);
    const isInvalidRange = plan.endVerse > maxVerseForPlanSurah || plan.startVerse < 1 || plan.startVerse > plan.endVerse;
    return (<div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200">{plan.title}</h4>
          <p className="text-xs text-slate-500 mt-1">سورة {plan.surahName} (الآيات {plan.startVerse} - {plan.endVerse})</p>
        </div>
        <button onClick={() => handleDeletePlan(plan.id)} className="text-slate-400 hover:text-red-500 transition">
          <Trash className="h-4 w-4" />
        </button>
      </div>
      <>
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
          <>
            {isInvalidRange && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs mb-3">
                <AlertCircle className="h-4 w-4 inline-block ml-1" />
                هذه الخطة تحتوي على نطاق آيات غير صحيح. سورة {plan.surahName} عدد آياتها {maxVerseForPlanSurah} آية فقط.
                <button onClick={() => handleCorrectPlan(plan)} className="block mt-2 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-800 dark:text-rose-300 font-bold hover:bg-rose-200">تصحيح الخطة</button>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[10px] font-medium text-slate-400">
                {plan.nextReviewDate ? `المراجعة: ${formatFirestoreDate(plan.nextReviewDate)}` : "بانتظار المراجعة الأولى"}
              </div>
              <button 
                onClick={() => setReviewPlanId(plan.id)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg transition"
              >
                قيم المراجعة
              </button>
            </div>
          </>
        )}
    </>
    </div>);
  };

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
              <select value={selectedSurahId} onChange={e => { // Clamps endVerse and startVerse when surah changes
                  const newSurahId = Number(e.target.value);
                  setSelectedSurahId(newSurahId);
                  const surahInfo = SURAHS.find(s => s.id === newSurahId);
                  setEndVerse(surahInfo?.verses || 1);
                  setStartVerse(1);
              }} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm">
                {SURAHS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-[9px] text-slate-400 mt-1">عدد آيات هذه السورة: {selectedSurahMaxVerse} آية</p>
            </div>
            <div>
              {/* startVerse input */}
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">من الآية</label>
              <input type="text" inputMode="numeric" min={1} max={Number(endVerse) > 1 ? Number(endVerse) - 1 : 1} value={startVerse} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^[0-9]+$/.test(val)) {
                    setStartVerse(val);
                  }
                }}
                onBlur={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val) || val < 1) val = 1;
                  if (val > selectedSurahMaxVerse) val = selectedSurahMaxVerse; // Clamp to surah max
                  if (val >= Number(endVerse) && Number(endVerse) > 1) val = Number(endVerse) - 1; // Ensure start < end
                  setStartVerse(val);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
            {/* endVerse input */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">إلى الآية</label>
              <input type="text" inputMode="numeric" min={Number(startVerse)} max={SURAHS.find(s => s.id === selectedSurahId)?.verses || 1} value={endVerse} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || /^[0-9]+$/.test(val)) {
                    setEndVerse(val);
                  }
                }}
                onBlur={(e) => {
                  const maxVerse = SURAHS.find(s => s.id === selectedSurahId)?.verses || 1;
                  let val = parseInt(e.target.value) || maxVerse; // Default to max if empty or NaN
                  
                  if (val < Number(startVerse)) {
                    val = Number(startVerse);
                  }
                  if (val > maxVerse) {
                    val = maxVerse;
                  }
                  setEndVerse(val);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
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
