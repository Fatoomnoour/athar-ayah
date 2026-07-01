import React, { useState } from 'react';
import { HelpCircle, X, Sparkles, TrendingUp, Brain, Calendar } from 'lucide-react';

export default function SpacedRepetitionExplanation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-full transition"
      >
        <HelpCircle className="h-4 w-4" />
        <span>كيف يعمل التكرار المتباعد؟</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600" />
                آلية التكرار المتباعد
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                التكرار المتباعد (Spaced Repetition) هو أسلوب علمي للمراجعة يعتمد على مراجعة المحفوظات على فترات متباعدة تتزايد تدريجياً، لضمان ترسيخها في الذاكرة طويلة الأمد بأقل جهد ممكن.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">صعب (غداً)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">إذا كان المقطع صعباً ومليئاً بالأخطاء، ستتم جدولته للمراجعة في اليوم التالي مباشرة.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">متوسط (بعد ٣ أيام)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">إذا تذكرته مع بعض التردد، ستتم مراجعته بعد ٣ أيام.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">جيد (بعد ٧ أيام)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">قراءة سلسة مع أخطاء طفيفة جداً، المراجعة القادمة بعد أسبوع.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">متقن (بعد ١٥ - ٣٠ يوم)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">حفظ راسخ ومتقن، ستتم المراجعة بعد فترة طويلة للحفاظ عليه وتثبيته.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-xl transition"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
