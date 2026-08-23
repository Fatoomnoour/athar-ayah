import confetti from "canvas-confetti";
import React, { useEffect, useMemo, useState } from "react";
import { User } from "../types";
import { SURAH_LIST, SURAH_VERSE_COUNTS } from "../utils/quranUtils";
import {
  BarChart,
  BookCheck,
  CheckCircle,
  Eye,
  EyeOff,
  RotateCcw,
  SkipBack,
  Target,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

type RecitationLevel = "easy" | "medium" | "hard" | "expert";

interface ActiveRecitationTabProps {
  currentUser: User | null;
  onShowToast: (
    message: string,
    type: "success" | "error" | "info"
  ) => void;
}

interface QuranVerse {
  number: number;
  text: string;
}

interface SessionSummary {
  correctAyahs: number;
  totalVerses: number;
  revealedWordsCount: number;
  retryCount: number;
  surahName: string;
}

async function getSurahVerses(surahId: number): Promise<QuranVerse[]> {
  const response = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch surah verses");
  }

  const data = await response.json();

  return (data.data?.ayahs || []).map((ayah: any) => ({
    number: Number(ayah.numberInSurah),
    text: String(ayah.text || ""),
  }));
}

const getLevelConfig = (level: RecitationLevel) => {
  switch (level) {
    case "easy":
      return {
        label: "سهل",
        description: "إخفاء بسيط للتثبيت",
        percent: 0.25,
      };
    case "medium":
      return {
        label: "متوسط",
        description: "إخفاء نصف الآية تقريبًا",
        percent: 0.5,
      };
    case "hard":
      return {
        label: "صعب",
        description: "إخفاء معظم الآية",
        percent: 0.75,
      };
    case "expert":
      return {
        label: "خبير",
        description: "إخفاء كامل الآية",
        percent: 1,
      };
    default:
      return {
        label: "سهل",
        description: "إخفاء بسيط للتثبيت",
        percent: 0.25,
      };
  }
};

const clampNumber = (value: number | string, min: number, max: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.max(min, Math.min(Math.floor(parsed), max));
};

const splitVerseWords = (text: string) => {
  return text.split(/\s+/).filter(Boolean);
};

const buildHiddenWordIndexes = (
  wordsCount: number,
  level: RecitationLevel,
  ayahNumber: number
): Set<number> => {
  if (wordsCount <= 0) {
    return new Set();
  }

  const percent = getLevelConfig(level).percent;

  if (percent >= 1) {
    return new Set(Array.from({ length: wordsCount }, (_, index) => index));
  }

  const hiddenCount = Math.max(1, Math.round(wordsCount * percent));

  const shuffledIndexes = Array.from({ length: wordsCount }, (_, index) => index)
    .sort((a, b) => {
      const scoreA = ((a + 1) * 37 + ayahNumber * 17) % 997;
      const scoreB = ((b + 1) * 37 + ayahNumber * 17) % 997;
      return scoreA - scoreB;
    });

  return new Set(shuffledIndexes.slice(0, hiddenCount));
};

export default function ActiveRecitationTab({
  currentUser,
  onShowToast,
}: ActiveRecitationTabProps) {
  const [surahId, setSurahId] = useState<number>(1);
  const [startVerse, setStartVerse] = useState<number | string>(1);
  const [endVerse, setEndVerse] = useState<number | string>(7);
  const [hideLevel, setHideLevel] = useState<RecitationLevel>("easy");

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [sessionVerses, setSessionVerses] = useState<QuranVerse[]>([]);

  const [manuallyRevealedWords, setManuallyRevealedWords] = useState<
    Set<number>
  >(new Set());

  const [hasRevealedAyah, setHasRevealedAyah] = useState(false);
  const [isCurrentAyahMarkedCorrect, setIsCurrentAyahMarkedCorrect] =
    useState(false);

  const [completedAyahNumbers, setCompletedAyahNumbers] = useState<
    Set<number>
  >(new Set());

  const [totalRevealedInSession, setTotalRevealedInSession] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [sessionSummary, setSessionSummary] =
    useState<SessionSummary | null>(null);

  const selectedSurahInfo = SURAH_LIST.find((surah) => surah.id === surahId);
  const selectedSurahName = selectedSurahInfo?.name || "الفاتحة";
  const maxVerses =
    SURAH_LIST.find((s) => s.id === surahId)?.verses || SURAH_VERSE_COUNTS[surahId - 1] || 7;

  const currentVerse = sessionVerses[currentVerseIndex];
  const words = useMemo(
    () => splitVerseWords(currentVerse?.text || ""),
    [currentVerse?.text]
  );

  const hiddenWordIndexes = useMemo(() => {
    return buildHiddenWordIndexes(
      words.length,
      hideLevel,
      currentVerse?.number || 1
    );
  }, [words.length, hideLevel, currentVerse?.number]);

  const currentLevelConfig = getLevelConfig(hideLevel);

  useEffect(() => {
    const newMax = SURAH_LIST.find(s => s.id === surahId)?.verses || SURAH_VERSE_COUNTS[surahId - 1] || 7;
    setStartVerse(1);
    setEndVerse(newMax);
  }, [surahId]);

  const clampNumber = (val: any, min: number, max: number) => {
    const num = Number(val);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  };

  const resetCurrentAyahState = () => {
    setManuallyRevealedWords(new Set());
    setHasRevealedAyah(false);
    setIsCurrentAyahMarkedCorrect(false);
  };

  const resetSession = () => {
    setIsSessionActive(false);
    setIsStartingSession(false);
    setSessionSummary(null);
    setCurrentVerseIndex(0);
    setSessionVerses([]);
    setManuallyRevealedWords(new Set());
    setHasRevealedAyah(false);
    setIsCurrentAyahMarkedCorrect(false);
    setCompletedAyahNumbers(new Set());
    setTotalRevealedInSession(0);
    setRetryCount(0);
  };

  const startSession = async () => {
    const safeSurahId = clampNumber(surahId, 1, 114);
    const safeMaxVerses = SURAH_LIST.find((s) => s.id === safeSurahId)?.verses || SURAH_VERSE_COUNTS[safeSurahId - 1] || 7;
    const safeStartVerse = clampNumber(startVerse, 1, safeMaxVerses);
    const safeEndVerse = clampNumber(endVerse, safeStartVerse, safeMaxVerses);

    setSurahId(safeSurahId);
    setStartVerse(safeStartVerse);
    setEndVerse(safeEndVerse);

    setIsStartingSession(true);

    try {
      const verses = await getSurahVerses(safeSurahId);

      const filteredVerses = verses.filter(
        (verse) =>
          verse.number >= safeStartVerse && verse.number <= safeEndVerse
      );

      if (filteredVerses.length === 0) {
        throw new Error("لا توجد آيات في هذا النطاق");
      }

      setSessionVerses(filteredVerses);
      setCurrentVerseIndex(0);
      setCompletedAyahNumbers(new Set());
      setTotalRevealedInSession(0);
      setRetryCount(0);
      setSessionSummary(null);
      resetCurrentAyahState();
      setIsSessionActive(true);
    } catch (error) {
      console.error("Error starting active recitation:", error);
      onShowToast("تعذر بدء جلسة التسميع. حاول مرة أخرى.", "error");
    } finally {
      setIsStartingSession(false);
    }
  };

  const isWordHidden = (index: number) => {
    if (hasRevealedAyah) {
      return false;
    }

    if (manuallyRevealedWords.has(index)) {
      return false;
    }

    return hiddenWordIndexes.has(index);
  };

  const toggleWord = (index: number) => {
    if (hasRevealedAyah) return;

    setManuallyRevealedWords((prev) => {
      const next = new Set(prev);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  const playSuccessSound = () => {
    try {
      const AudioContextConstructor =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextConstructor) return;

      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        880,
        audioContext.currentTime + 0.1
      );

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn("Success sound is unavailable:", error);
    }
  };

  const handleRevealAyah = () => {
    if (!currentVerse) return;

    setHasRevealedAyah(true);
    setIsCurrentAyahMarkedCorrect(false);
  };

  const handleHideAyahAgain = () => {
    setHasRevealedAyah(false);
    setIsCurrentAyahMarkedCorrect(false);
    setManuallyRevealedWords(new Set());
  };

  const handleNeedsRetry = () => {
    setRetryCount((prev) => prev + 1);
    setHasRevealedAyah(false);
    setIsCurrentAyahMarkedCorrect(false);
    setManuallyRevealedWords(new Set());
    onShowToast("حاول تسميع الآية مرة أخرى، ربنا يفتح عليك.", "info");
  };

  const handleMarkCorrect = () => {
    if (!hasRevealedAyah || !currentVerse) {
      onShowToast("اكشف الآية أولًا ثم قيّم تسميعك.", "info");
      return;
    }

    setIsCurrentAyahMarkedCorrect(true);

    setCompletedAyahNumbers((prev) => {
      const next = new Set(prev);
      next.add(currentVerse.number);
      return next;
    });

    setTotalRevealedInSession((prev) => prev + manuallyRevealedWords.size);

    playSuccessSound();
    onShowToast("أحسنت، تم اعتماد هذه الآية.", "success");
  };

  const handleNextVerse = () => {
    if (!isCurrentAyahMarkedCorrect) {
      onShowToast("لازم تكشف الآية وتحدد أنك سمّعتها صح أولًا.", "info");
      return;
    }

    if (currentVerseIndex < sessionVerses.length - 1) {
      setCurrentVerseIndex((prev) => prev + 1);
      resetCurrentAyahState();
      return;
    }

    if (completedAyahNumbers.size > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#10b981", "#34d399", "#059669"],
      });
    }

    onShowToast("تم إكمال جلسة التسميع!", "success");
    handleEndSession(true);
  };

  const handleEndSession = (completed = false) => {
    const finalCompletedAyahs = completed
      ? completedAyahNumbers.size
      : completedAyahNumbers.size;

    setSessionSummary({
      correctAyahs: finalCompletedAyahs,
      totalVerses: sessionVerses.length,
      revealedWordsCount: totalRevealedInSession,
      retryCount,
      surahName: selectedSurahName,
    });

    setIsSessionActive(false);
  };

  const progressPercent = sessionVerses.length
    ? Math.round((completedAyahNumbers.size / sessionVerses.length) * 100)
    : 0;

  if (isSessionActive && currentVerse && !sessionSummary) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans"
        dir="rtl"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Target className="h-5 w-5" />
              تسميع نشط: سورة {selectedSurahName}
            </h2>

            <p className="text-xs text-slate-400 mt-1 font-bold">
              المستوى الحالي: {currentLevelConfig.label} —{" "}
              {currentLevelConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
              آية {currentVerse.number}
            </span>

            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-lg">
              {completedAyahNumbers.size} / {sessionVerses.length}
            </span>

            <button
              onClick={resetSession}
              className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
              title="خروج بدون حفظ"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            المخفي الآن: {hiddenWordIndexes.size} من {words.length} كلمة
          </span>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            كلمات كشفتها كمساعدة: {manuallyRevealedWords.size}
          </span>
        </div>

        <div className="min-h-[200px] flex flex-wrap justify-center content-center gap-x-3 gap-y-6 font-quran text-3xl md:text-4xl leading-relaxed text-slate-800 dark:text-slate-100 mb-8 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50">
          {words.map((word, index) => {
            const hidden = isWordHidden(index);

            return (
              <span
                key={`${word}-${index}`}
                onClick={() => toggleWord(index)}
                className={`cursor-pointer transition-all duration-300 rounded relative inline-flex justify-center items-center ${
                  hidden
                    ? "bg-slate-200 dark:bg-slate-800 text-transparent select-none min-w-[3em] h-[1.5em] hover:bg-slate-300 dark:hover:bg-slate-700"
                    : manuallyRevealedWords.has(index) && !hasRevealedAyah
                    ? "text-amber-600 dark:text-amber-400 font-bold"
                    : "text-slate-800 dark:text-slate-100 hover:text-emerald-600"
                }`}
                title={hidden ? "اضغط لكشف هذه الكلمة كمساعدة" : undefined}
              >
                {hidden ? "" : word}
              </span>
            );
          })}
        </div>

        {manuallyRevealedWords.size > 0 && !hasRevealedAyah && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-2">
              كلمات كشفتها كمساعدة:
            </h3>

            <div className="flex flex-wrap gap-2">
              {Array.from(manuallyRevealedWords).map((index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 rounded-lg text-sm font-quran"
                >
                  {words[index]}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasRevealedAyah && !isCurrentAyahMarkedCorrect && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-100 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-center">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              راجع الآية الآن، ثم اختر هل سمّعتها صحيح أم تحتاج إعادة.
            </p>
          </div>
        )}

        {isCurrentAyahMarkedCorrect && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-center">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              تم اعتماد الآية. يمكنك الانتقال للآية التالية.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={hasRevealedAyah ? handleHideAyahAgain : handleRevealAyah}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-2 transition text-sm"
          >
            {hasRevealedAyah ? (
              <>
                <EyeOff className="h-5 w-5" />
                إخفاء الآية وإعادة المحاولة
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                كشف الآية للمراجعة
              </>
            )}
          </button>

          {hasRevealedAyah && !isCurrentAyahMarkedCorrect && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <button
                onClick={handleNeedsRetry}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 font-bold rounded-xl flex items-center gap-2 transition text-sm"
              >
                <ThumbsDown className="h-5 w-5" />
                أحتاج إعادة
              </button>

              <button
                onClick={handleMarkCorrect}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold rounded-xl flex items-center gap-2 transition text-sm"
              >
                <ThumbsUp className="h-5 w-5" />
                سمّعت صحيح
              </button>
            </div>
          )}

          <button
            onClick={() => handleEndSession(false)}
            className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 font-bold rounded-xl flex items-center gap-2 transition"
          >
            <BookCheck className="h-5 w-5" />
            إنهاء وحفظ النتيجة
          </button>

          <button
            onClick={handleNextVerse}
            disabled={!isCurrentAyahMarkedCorrect}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition disabled:bg-slate-400 disabled:cursor-not-allowed text-sm"
          >
            <SkipBack className="h-5 w-5" />
            {currentVerseIndex < sessionVerses.length - 1
              ? "الآية التالية"
              : "إنهاء التسميع"}
          </button>
        </div>
      </div>
    );
  }

  if (isStartingSession || (isSessionActive && !currentVerse)) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans text-center"
        dir="rtl"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">جاري تحميل جلسة التسميع...</p>
      </div>
    );
  }

  if (sessionSummary) {
    const summaryProgressPercent = sessionSummary.totalVerses
      ? Math.round(
          (sessionSummary.correctAyahs / sessionSummary.totalVerses) * 100
        )
      : 0;

    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans text-center"
        dir="rtl"
      >
        <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
          <BarChart className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          نتيجة جلسة التسميع
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          سورة {sessionSummary.surahName} — خلاصة أدائك في هذه الجلسة.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 text-center">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              الآيات الصحيحة
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {sessionSummary.correctAyahs} / {sessionSummary.totalVerses}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              نسبة التقدم
            </span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {summaryProgressPercent}%
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              كلمات كُشفت كمساعدة
            </span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {sessionSummary.revealedWordsCount}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              مرات الإعادة
            </span>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {sessionSummary.retryCount}
            </p>
          </div>
        </div>

        <button
          onClick={resetSession}
          className="w-full max-w-xs mx-auto py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
        >
          <CheckCircle className="h-5 w-5" />
          العودة للقائمة الرئيسية
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans"
      dir="rtl"
    >
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6 text-emerald-600" />
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
            التسميع النشط
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            اختر السورة ونطاق الآيات ومستوى الإخفاء، ثم ابدأ التسميع.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
            السورة
          </label>

          <select
            value={surahId}
            onChange={(event) => setSurahId(Number(event.target.value))}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          >
            {SURAH_LIST.map((surah) => (
              <option key={surah.id} value={surah.id}>
                {surah.id}. {surah.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
            من الآية
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={startVerse}
            onChange={(event) => {
              const value = event.target.value;

              if (value === "" || /^[0-9]+$/.test(value)) {
                setStartVerse(value === "" ? "" : Number(value));
              }
            }}
            onBlur={(event) => {
              const safeStart = clampNumber(event.target.value, 1, maxVerses);
              const safeEnd = clampNumber(endVerse, safeStart, maxVerses);

              setStartVerse(safeStart);
              setEndVerse(safeEnd);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
            إلى الآية
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={endVerse}
            onChange={(event) => {
              const value = event.target.value;

              if (value === "" || /^[0-9]+$/.test(value)) {
                setEndVerse(value === "" ? "" : Number(value));
              }
            }}
            onBlur={(event) => {
              const safeStart = clampNumber(startVerse, 1, maxVerses);
              const safeEnd = clampNumber(event.target.value, safeStart, maxVerses);

              setStartVerse(safeStart);
              setEndVerse(safeEnd);
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">
          {language === "ar" ? "مستوى الإخفاء" : "Difficulty level"}
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              id: "easy",
              label: "سهل",
              hint: "إخفاء ٢٥٪ فقط",
            },
            {
              id: "medium",
              label: "متوسط",
              hint: "إخفاء ٥٠٪",
            },
            {
              id: "hard",
              label: "صعب",
              hint: "إخفاء ٧٥٪",
            },
            {
              id: "expert",
              label: "خبير",
              hint: "إخفاء كامل",
            },
          ].map((level) => (
            <button
              key={level.id}
              onClick={() => setHideLevel(level.id as RecitationLevel)}
              className={`p-3 rounded-xl border text-sm font-bold transition ${
                hideLevel === level.id
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500"
              }`}
            >
              <span className="block">{level.label}</span>
              <span
                className={`block text-[10px] mt-1 ${
                  hideLevel === level.id
                    ? "text-white/80"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {level.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={startSession}
        disabled={isStartingSession}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-black rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
      >
        <CheckCircle className="h-5 w-5" />
        {isStartingSession ? (language === "ar" ? "جاري بدء التسميع..." : "Preparing verses...") : (language === "ar" ? "ابدأ التسميع الآن" : "Start Recitation")}
      </button>
    </div>
  );
}