import React, { useState, useEffect } from "react";
import { User } from "../types";
import { SURAH_LIST } from "../utils/quranUtils";
import { CheckCircle, Eye, EyeOff, RotateCcw, SkipBack, Target } from "lucide-react";

async function getSurahVerses(surahId: number) {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`);
  if (!res.ok) throw new Error("Failed to fetch surah verses");
  const data = await res.json();
  return data.data.ayahs.map((ayah: any) => ({
    number: ayah.numberInSurah,
    text: ayah.text
  }));
}

interface ActiveRecitationTabProps {
  currentUser: User | null;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ActiveRecitationTab({ currentUser, onShowToast }: ActiveRecitationTabProps) {
  const [surahId, setSurahId] = useState<number>(1);
  const [startVerse, setStartVerse] = useState<number>(1);
  const [endVerse, setEndVerse] = useState<number>(7);
  const [hideLevel, setHideLevel] = useState<"25" | "50" | "first_words" | "full">("full");
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [sessionVerses, setSessionVerses] = useState<{number: number, text: string}[]>([]);
  const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
  const [isVerseFullyRevealed, setIsVerseFullyRevealed] = useState(false);

  const startSession = async () => {
    try {
      const verses = await getSurahVerses(surahId);
      const filtered = verses.filter(v => v.number >= startVerse && v.number <= endVerse);
      if (filtered.length === 0) throw new Error("لا توجد آيات في هذا النطاق");
      setSessionVerses(filtered);
      setCurrentVerseIndex(0);
      setRevealedWords(new Set());
      setIsVerseFullyRevealed(false);
      setIsSessionActive(true);
    } catch (err) {
      onShowToast("خطأ في بدء جلسة التسميع", "error");
    }
  };

  const currentVerse = sessionVerses[currentVerseIndex];
  
  const words = currentVerse ? currentVerse.text.split(" ") : [];

  const isWordHidden = (index: number) => {
    if (isVerseFullyRevealed) return false;
    if (revealedWords.has(index)) return false;
    
    if (hideLevel === "full") return true;
    if (hideLevel === "first_words") {
      return index > 1; // Hide everything except first two words
    }
    // Simple random hide based on percentage (deterministic by index for stability)
    const shouldHide = (index * 7 + currentVerse.number) % 100 < parseInt(hideLevel);
    return shouldHide;
  };

  const toggleWord = (index: number) => {
    setRevealedWords(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleNextVerse = () => {
    if (currentVerseIndex < sessionVerses.length - 1) {
      setCurrentVerseIndex(prev => prev + 1);
      setRevealedWords(new Set());
      setIsVerseFullyRevealed(false);
    } else {
      // Session finished
      onShowToast("تم إكمال جلسة التسميع!", "success");
      setIsSessionActive(false);
    }
  };

  if (isSessionActive) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans" dir="rtl">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <Target className="h-5 w-5" />
            تسميع نشط: سورة {SURAH_LIST.find(s => s.id === surahId)?.name}
          </h2>
          <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">آية {currentVerse.number}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            تم كشف {isVerseFullyRevealed ? words.length : revealedWords.size} من {words.length} كلمة
          </span>
        </div>

        <div className="min-h-[200px] flex flex-wrap justify-center content-center gap-x-3 gap-y-6 font-quran text-3xl md:text-4xl leading-relaxed text-slate-800 dark:text-slate-100 mb-8 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50">
          {words.map((word, idx) => {
            const hidden = isWordHidden(idx);
            return (
              <span 
                key={idx}
                onClick={() => toggleWord(idx)}
                className={`cursor-pointer transition-all duration-300 rounded relative inline-flex justify-center items-center ${
                  hidden 
                    ? "bg-slate-200 dark:bg-slate-800 text-transparent select-none min-w-[3em] h-[1.5em] hover:bg-slate-300 dark:hover:bg-slate-700" 
                    : revealedWords.has(idx) 
                      ? "text-amber-600 dark:text-amber-400 font-bold" 
                      : "text-slate-800 dark:text-slate-100 hover:text-emerald-600"
                }`}
              >
                {hidden ? "" : word}
              </span>
            );
          })}
        </div>
        
        {revealedWords.size > 0 && !isVerseFullyRevealed && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-2 flex items-center gap-2">
              كلمات تحتاج تثبيتًا:
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(revealedWords).map(idx => (
                <span key={idx} className="px-3 py-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 rounded-lg text-sm font-quran">
                  {words[idx]}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button 
            onClick={() => setIsVerseFullyRevealed(!isVerseFullyRevealed)}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-2 transition"
          >
            {isVerseFullyRevealed ? <><EyeOff className="h-5 w-5"/> إخفاء الآية</> : <><Eye className="h-5 w-5"/> كشف الآية</>}
          </button>
          
          <button 
            onClick={() => {
              setRevealedWords(new Set());
              setIsVerseFullyRevealed(false);
            }}
            className="px-6 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-bold rounded-xl flex items-center gap-2 transition"
          >
            <RotateCcw className="h-5 w-5"/> إعادة المحاولة
          </button>

          <button 
            onClick={handleNextVerse}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <SkipBack className="h-5 w-5" />
            {currentVerseIndex < sessionVerses.length - 1 ? "الآية التالية" : "إنهاء التسميع"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6 text-emerald-600" />
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">التسميع النشط</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">السورة</label>
          <select 
            value={surahId}
            onChange={(e) => setSurahId(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          >
            {SURAH_LIST.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">من الآية</label>
          <input 
            type="number"
            min={1}
            value={startVerse}
            onChange={e => setStartVerse(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">إلى الآية</label>
          <input 
            type="number"
            min={startVerse}
            value={endVerse}
            onChange={e => setEndVerse(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">مستوى الإخفاء</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "25", label: "سهل" },
            { id: "50", label: "متوسط" },
            { id: "first_words", label: "صعب" },
            { id: "full", label: "إخفاء كامل" },
          ].map(level => (
            <button
              key={level.id}
              onClick={() => setHideLevel(level.id as any)}
              className={`p-3 rounded-xl border text-sm font-bold transition ${hideLevel === level.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500'}`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={startSession}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
      >
        <CheckCircle className="h-5 w-5" />
        ابدأ التسميع الآن
      </button>
    </div>
  );
}
