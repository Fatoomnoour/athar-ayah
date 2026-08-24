import confetti from "canvas-confetti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { User } from "../types";
import { SURAH_LIST, SURAH_VERSE_COUNTS } from "../utils/quranUtils";
import {
  BarChart,
  BookCheck,
  CheckCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Mic,
  MicOff,
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

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
};

const normalizeArabicSpeech = (value: string) => value
  .normalize("NFKC")
  .replace(/[\u064B-\u065F\u0670]/g, "")
  .replace(/[إأآٱ]/g, "ا")
  .replace(/ى/g, "ي")
  .replace(/ة/g, "ه")
  .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

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

const getLevelConfig = (level: RecitationLevel, language: "ar" | "en" = "ar") => {
  switch (level) {
    case "easy":
      return {
        label: language === "ar" ? "سهل" : "Easy",
        description: language === "ar" ? "إخفاء بسيط للتثبيت" : "Simple hiding for retention",
        percent: 0.25,
      };
    case "medium":
      return {
        label: language === "ar" ? "متوسط" : "Medium",
        description: language === "ar" ? "إخفاء نصف الآية تقريبًا" : "Hides about half of the verse",
        percent: 0.5,
      };
    case "hard":
      return {
        label: language === "ar" ? "صعب" : "Hard",
        description: language === "ar" ? "إخفاء معظم الآية" : "Hides most of the verse",
        percent: 0.75,
      };
    case "expert":
      return {
        label: language === "ar" ? "خبير" : "Expert",
        description: language === "ar" ? "إخفاء كامل الآية" : "Hides the entire verse",
        percent: 1,
      };
    default:
      return {
        label: language === "ar" ? "سهل" : "Easy",
        description: language === "ar" ? "إخفاء بسيط للتثبيت" : "Simple hiding for retention",
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

    const percent = getLevelConfig(level, "ar").percent;

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

import { useLanguage } from "../i18n";

export default function ActiveRecitationTab({
  currentUser,
  onShowToast,
}: ActiveRecitationTabProps) {
  const { language, direction, t } = useLanguage();
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
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [speechScore, setSpeechScore] = useState<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

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

  const currentLevelConfig = getLevelConfig(hideLevel, language);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    setSpeechTranscript("");
    setSpeechScore(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [currentVerse?.number]);

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

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startListening = () => {
    if (!currentVerse) return;
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      onShowToast(
        language === "ar"
          ? "التعرف الصوتي غير متاح في هذا المتصفح. يمكنك التسميع ذاتياً."
          : "Speech recognition is not available in this browser. You can recite self-guided.",
        "info"
      );
      return;
    }

    stopListening();
    const recognition = new Recognition();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = String(event.results[0]?.[0]?.transcript || "");
      const expectedWords = normalizeArabicSpeech(currentVerse.text).split(" ").filter(Boolean);
      const spokenWords = normalizeArabicSpeech(transcript).split(" ").filter(Boolean);
      const spokenSet = new Set(spokenWords);
      const matchedWords = expectedWords.filter((word) => spokenSet.has(word)).length;
      const score = expectedWords.length > 0
        ? Math.round((matchedWords / expectedWords.length) * 100)
        : 0;

      setSpeechTranscript(transcript);
      setSpeechScore(score);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      const errorMessage = event.error === "not-allowed"
        ? (language === "ar" ? "تم رفض صلاحية الميكروفون." : "Microphone permission was denied.")
        : (language === "ar" ? "تعذر التقاط الصوت، حاول مرة أخرى." : "Could not capture speech. Please try again.");
      onShowToast(errorMessage, "error");
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setSpeechTranscript("");
      setSpeechScore(null);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      onShowToast(
        language === "ar" ? "تعذر بدء الميكروفون." : "Unable to start the microphone.",
        "error"
      );
    }
  };

  const resetCurrentAyahState = () => {
    setManuallyRevealedWords(new Set());
    setHasRevealedAyah(false);
    setIsCurrentAyahMarkedCorrect(false);
  };

  const resetSession = () => {
    stopListening();
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
    stopListening();
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
        className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans ${language === 'ar' ? 'text-right' : 'text-left'}`}
        dir={direction}
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Target className="h-5 w-5" />
              {language === "ar" ? `تسميع نشط: سورة ${selectedSurahName}` : `Active Recitation: Surah ${selectedSurahName}`}
            </h2>

            <p className="text-xs text-slate-400 mt-1 font-bold">
              {language === "ar" ? "المستوى الحالي:" : "Current Level:"} {currentLevelConfig.label} —{" "}
              {currentLevelConfig.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
              {language === "ar" ? "آية" : "Verse"} {currentVerse.number}
            </span>

            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-lg">
              {completedAyahNumbers.size} / {sessionVerses.length}
            </span>

            <button
              onClick={resetSession}
              className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
              title={language === "ar" ? "خروج بدون حفظ" : "Exit without saving"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-5 p-4 rounded-xl border border-blue-100 bg-blue-50/70 dark:bg-blue-950/20 dark:border-blue-900/40" dir={direction}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {language === "ar" ? "استمع لتسميعك (اختياري)" : "Listen to your recitation (optional)"}
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-300/80 mt-1">
                {language === "ar"
                  ? "يُستخدم الميكروفون أثناء الجلسة فقط. لا يحفظ التطبيق التسجيل أو يرفعه، وقد يعالج المتصفح الصوت وفق مزوّده."
                  : "The microphone is used only during this session. The app does not save or upload recordings; the browser may process speech according to its provider."}
              </p>
            </div>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={!speechSupported && !isListening}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-sm"
              title={language === "ar" ? "السماح بالميكروفون عند بدء التسميع" : "Allow microphone when starting recitation"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {isListening
                ? (language === "ar" ? "إيقاف الاستماع" : "Stop listening")
                : (language === "ar" ? "بدء الاستماع" : "Start listening")}
            </button>
          </div>
          {!speechSupported && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              {language === "ar" ? "هذا المتصفح لا يدعم التعرف الصوتي؛ أكمل التسميع اليدوي." : "Speech recognition is unavailable; continue with self-guided recitation."}
            </p>
          )}
          {speechTranscript && (
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold">{language === "ar" ? "النص الملتقط:" : "Captured text:"}</span> {speechTranscript}
              {speechScore !== null && (
                <span className="font-bold text-blue-700 dark:text-blue-400"> — {language === "ar" ? `تطابق تقريبي ${speechScore}%` : `Approximate match ${speechScore}%`}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {language === "ar" ? `المخفي الآن: ${hiddenWordIndexes.size} من ${words.length} كلمة` : `Hidden now: ${hiddenWordIndexes.size} of ${words.length} words`}
          </span>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {language === "ar" ? `كلمات كشفتها كمساعدة: ${manuallyRevealedWords.size}` : `Words revealed for help: ${manuallyRevealedWords.size}`}
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
                title={hidden ? (language === "ar" ? "اضغط لكشف هذه الكلمة كمساعدة" : "Click to reveal this word for help") : undefined}
              >
                {hidden ? "" : word}
              </span>
            );
          })}
        </div>

        {manuallyRevealedWords.size > 0 && !hasRevealedAyah && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-2">
              {language === "ar" ? "كلمات كشفتها كمساعدة:" : "Words revealed for help:"}
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
              {language === "ar" ? "راجع الآية الآن، ثم اختر هل سمّعتها صحيح أم تحتاج إعادة." : "Review the verse now, then choose if you recited it correctly or need to repeat."}
            </p>
          </div>
        )}

        {isCurrentAyahMarkedCorrect && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-center">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {language === "ar" ? "تم اعتماد الآية. يمكنك الانتقال للآية التالية." : "Verse marked correct. You can move to the next verse."}
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
                {language === "ar" ? "إخفاء الآية وإعادة المحاولة" : "Hide Verse and Retry"}
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                {language === "ar" ? "كشف الآية للمراجعة" : "Reveal Verse to Review"}
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
                {language === "ar" ? "أحتاج إعادة" : "Need Retry"}
              </button>

              <button
                onClick={handleMarkCorrect}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold rounded-xl flex items-center gap-2 transition text-sm"
              >
                <ThumbsUp className="h-5 w-5" />
                {language === "ar" ? "سمّعت صحيح" : "Recited Correctly"}
              </button>
            </div>
          )}

          <button
            onClick={() => handleEndSession(false)}
            className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 font-bold rounded-xl flex items-center gap-2 transition"
          >
            <BookCheck className="h-5 w-5" />
            {language === "ar" ? "إنهاء وحفظ النتيجة" : "End and Save Result"}
          </button>

          <button
            onClick={handleNextVerse}
            disabled={!isCurrentAyahMarkedCorrect}
            className={`px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition disabled:bg-slate-400 disabled:cursor-not-allowed text-sm ${language === 'en' ? 'flex-row-reverse' : ''}`}
          >
            <SkipBack className={`h-5 w-5 ${language === 'en' ? 'rotate-180' : ''}`} />
            {currentVerseIndex < sessionVerses.length - 1
              ? (language === "ar" ? "الآية التالية" : "Next Verse")
              : (language === "ar" ? "إنهاء التسميع" : "Finish Recitation")}
          </button>
        </div>
      </div>
    );
  }

  if (isStartingSession || (isSessionActive && !currentVerse)) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans text-center"
        dir={direction}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
        <p className="text-sm text-slate-500">{language === "ar" ? "جاري تحميل جلسة التسميع..." : "Loading recitation session..."}</p>
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
        dir={direction}
      >
        <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
          <BarChart className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          {language === "ar" ? "نتيجة جلسة التسميع" : "Recitation Session Result"}
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          {language === "ar" ? `سورة ${sessionSummary.surahName} — خلاصة أدائك في هذه الجلسة.` : `Surah ${sessionSummary.surahName} — summary of your performance in this session.`}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 text-center">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              {language === "ar" ? "الآيات الصحيحة" : "Correct Verses"}
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {sessionSummary.correctAyahs} / {sessionSummary.totalVerses}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              {language === "ar" ? "نسبة التقدم" : "Progress Rate"}
            </span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {summaryProgressPercent}%
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              {language === "ar" ? "كلمات كُشفت كمساعدة" : "Words Revealed"}
            </span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {sessionSummary.revealedWordsCount}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400">
              {language === "ar" ? "مرات الإعادة" : "Retries"}
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
          {language === "ar" ? "العودة للقائمة الرئيسية" : "Return to Main Menu"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm font-sans ${language === 'ar' ? 'text-right' : 'text-left'}`}
      dir={direction}
    >
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-6 w-6 text-emerald-600" />
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
            {language === "ar" ? "التسميع النشط" : "Active Recitation"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === "ar" ? "اختر السورة ونطاق الآيات ومستوى الإخفاء، ثم ابدأ التسميع." : "Select Surah, verse range, and difficulty level, then start."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
            {language === "ar" ? "السورة" : "Surah"}
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
            {language === "ar" ? "من الآية" : "From Verse"}
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
            {language === "ar" ? "إلى الآية" : "To Verse"}
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
              label: language === "ar" ? "سهل" : "Easy",
              hint: language === "ar" ? "إخفاء ٢٥٪ فقط" : "Hide 25% only",
            },
            {
              id: "medium",
              label: language === "ar" ? "متوسط" : "Medium",
              hint: language === "ar" ? "إخفاء ٥٠٪" : "Hide 50%",
            },
            {
              id: "hard",
              label: language === "ar" ? "صعب" : "Hard",
              hint: language === "ar" ? "إخفاء ٧٥٪" : "Hide 75%",
            },
            {
              id: "expert",
              label: language === "ar" ? "خبير" : "Expert",
              hint: language === "ar" ? "إخفاء كامل" : "Hide completely",
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