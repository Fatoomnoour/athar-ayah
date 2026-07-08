import React, { useState, useEffect } from "react";
import {
  Award,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { calculateNextReview } from "../utils/quranUtils";

interface MemorizeSessionProps {
  planId: string;
  planTitle: string;
  surahId: number;
  surahName: string;
  startVerse: number;
  endVerse: number;
  onSessionComplete: (
    planId: string,
    rating: "hard" | "medium" | "easy" | "mastered",
    intervalDays: number,
    nextReviewDate: string
  ) => Promise<void>;
  onClose: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  onPlayAyah: (surahId: number, verseNumber: number, text: string) => void;
}

type StepType = "listen" | "read" | "hide" | "test" | "rate";

const QURAN_STOP_MARKS_REGEX =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED۞۩]/g;

const cleanVerseText = (text: string): string => {
  if (!text) return "";

  return text
    .replace(QURAN_STOP_MARKS_REGEX, "")
    .replace(/[()[\]{}«»"'.،؛:!?؟]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const getVerseWords = (text: string): string[] => {
  return cleanVerseText(text)
    .split(/\s+/)
    .filter(Boolean);
};

const normalizeArabic = (text: string): string => {
  if (!text) return "";

  return text
    .replace(QURAN_STOP_MARKS_REGEX, "")
    .replace(/ـ/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[()[\]{}«»"'.،؛:!?؟]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export default function MemorizeSession({
  planId,
  planTitle,
  surahId,
  surahName,
  startVerse,
  endVerse,
  onSessionComplete,
  onClose,
  onShowToast,
  onPlayAyah,
}: MemorizeSessionProps) {
  const [activeStep, setActiveStep] = useState<StepType>("listen");
  const [currentVerse, setCurrentVerse] = useState<number>(startVerse);
  const [verseText, setVerseText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [hideMode, setHideMode] = useState<
    "none" | "random" | "first_word" | "full"
  >("none");

  const [testType, setTestType] = useState<
    "fill_blank" | "scramble" | "next_verse"
  >("fill_blank");

  const [scrambledWords, setScrambledWords] = useState<
    { id: string; text: string; isSelected: boolean }[]
  >([]);
  const [userArrangedWords, setUserArrangedWords] = useState<string[]>([]);
  const [scrambleCompleted, setScrambleCompleted] = useState<boolean>(false);

  const [blankWordIndex, setBlankWordIndex] = useState<number>(-1);
  const [blankAnswerInput, setBlankAnswerInput] = useState<string>("");
  const [isBlankCorrect, setIsBlankCorrect] = useState<boolean | null>(null);

  const [nextVerseOptions, setNextVerseOptions] = useState<string[]>([]);
  const [selectedNextOption, setSelectedNextOption] = useState<string>("");
  const [isNextOptionCorrect, setIsNextOptionCorrect] =
    useState<boolean | null>(null);

  const isLastVerseOfPlan = currentVerse === endVerse;
  const isTestCompleted =
    isBlankCorrect === true ||
    scrambleCompleted === true ||
    isNextOptionCorrect === true;

  useEffect(() => {
    fetchVerse();
  }, [currentVerse]);

  useEffect(() => {
    if (verseText) {
      setupChallenges();
    }
  }, [verseText, testType]);

  const fetchVerse = async () => {
    setIsLoading(true);
    setVerseText("");
    setBlankAnswerInput("");
    setIsBlankCorrect(null);
    setScrambleCompleted(false);
    setSelectedNextOption("");
    setIsNextOptionCorrect(null);

    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surahId}:${currentVerse}/quran-uthmani`
      );

      if (res.ok) {
        const result = await res.json();
        setVerseText(result.data?.text || "");
      } else {
        setVerseText("فشل تحميل نص الآية.");
      }
    } catch (err) {
      console.error(err);
      setVerseText("فشل تحميل نص الآية للذاكرة.");
    } finally {
      setIsLoading(false);
    }
  };

  const setupChallenges = async () => {
    const wordsArray = getVerseWords(verseText);

    setIsBlankCorrect(null);
    setBlankAnswerInput("");
    setScrambleCompleted(false);
    setSelectedNextOption("");
    setIsNextOptionCorrect(null);

    if (wordsArray.length === 0) {
      setBlankWordIndex(-1);
      setScrambledWords([]);
      setUserArrangedWords([]);
      setNextVerseOptions([]);
      return;
    }

    if (testType === "scramble") {
      const wordsWithIds = wordsArray.map((word, index) => ({
        id: `word-${index}-${word}`,
        text: word,
        isSelected: false,
      }));

      const scrambled = [...wordsWithIds];

      for (let i = scrambled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
      }

      setScrambledWords(scrambled);
      setUserArrangedWords([]);
      return;
    }

    if (testType === "fill_blank") {
      const validIndices = wordsArray
        .map((word, index) => (cleanVerseText(word).length >= 3 ? index : -1))
        .filter((index) => index !== -1);

      const selectedIndex =
        validIndices.length > 0
          ? validIndices[Math.floor(Math.random() * validIndices.length)]
          : Math.floor(wordsArray.length / 2);

      setBlankWordIndex(selectedIndex);
      return;
    }

    if (testType === "next_verse") {
      if (isLastVerseOfPlan) {
        setNextVerseOptions([]);
        return;
      }

      const nextNumber = currentVerse + 1;

      try {
        const resRealNext = await fetch(
          `https://api.alquran.cloud/v1/ayah/${surahId}:${nextNumber}/quran-uthmani`
        );

        let realNextText = "";

        if (resRealNext.ok) {
          const result = await resRealNext.json();
          realNextText = result.data?.text || "";
        }

        const distractors = [
          "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا",
          "وَالْعَصْرِ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ",
          "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
          "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
        ];

        const options = [
          realNextText || `الآية رقم ${nextNumber}`,
          distractors[0],
          distractors[1],
        ];

        setNextVerseOptions(options.sort(() => Math.random() - 0.5));
      } catch (err) {
        console.error(err);
        setNextVerseOptions([]);
      }
    }
  };

  const handleWordClick = (wordId: string, text: string) => {
    setScrambledWords((prev) =>
      prev.map((word) =>
        word.id === wordId ? { ...word, isSelected: true } : word
      )
    );

    setUserArrangedWords((prev) => [...prev, text]);
  };

  const handleResetScramble = () => {
    setScrambledWords((prev) =>
      prev.map((word) => ({ ...word, isSelected: false }))
    );
    setUserArrangedWords([]);
    setScrambleCompleted(false);
  };

  const handleVerifyScramble = () => {
    const originalWords = getVerseWords(verseText);
    const originalJoined = originalWords.join(" ");
    const userJoined = userArrangedWords.join(" ");

    if (userArrangedWords.length === 0) {
      onShowToast("رتّب كلمات الآية أولاً ثم اضغط تأكيد الترتيب", "info");
      return;
    }

    if (normalizeArabic(originalJoined) === normalizeArabic(userJoined)) {
      setScrambleCompleted(true);
      onShowToast("أحسنت! ترتيب الآية صحيح تماماً ✨", "success");
    } else {
      setScrambleCompleted(false);
      onShowToast("الترتيب غير مطابق، حاول مجدداً بارك الله فيك", "error");
      handleResetScramble();
    }
  };

  const handleVerifyBlank = () => {
    const wordsArray = getVerseWords(verseText);
    const correctWord = wordsArray[blankWordIndex] || "";

    if (!correctWord || blankWordIndex < 0) {
      onShowToast("لم يتم تجهيز سؤال الفراغ بعد، حاول مرة أخرى", "info");
      setupChallenges();
      return;
    }

    if (!blankAnswerInput.trim()) {
      onShowToast("يرجى كتابة الكلمة المفقودة", "info");
      return;
    }

    if (normalizeArabic(blankAnswerInput) === normalizeArabic(correctWord)) {
      setIsBlankCorrect(true);
      onShowToast("إجابة صحيحة ومباركة! 🎉", "success");
    } else {
      setIsBlankCorrect(false);
      onShowToast("حاول مرة أخرى، الإجابة غير مطابقة", "error");
    }
  };

  const handleVerifyNextOption = async (option: string) => {
    setSelectedNextOption(option);

    const nextNumber = currentVerse + 1;

    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surahId}:${nextNumber}/quran-uthmani`
      );

      if (res.ok) {
        const result = await res.json();
        const correctText = result.data?.text || "";

        if (normalizeArabic(option) === normalizeArabic(correctText)) {
          setIsNextOptionCorrect(true);
          onShowToast(
            "صحيح! أنت على دراية ممتازة بالترتيب والتتالي 🌟",
            "success"
          );
        } else {
          setIsNextOptionCorrect(false);
          onShowToast("خيار خاطئ. تذكر سياق السورة والآية التي تليها", "error");
        }
      }
    } catch (err) {
      console.error(err);
      onShowToast("تعذر التحقق من الآية التالية حالياً", "error");
    }
  };

  const handleRateHifz = async (
    rating: "hard" | "medium" | "easy" | "mastered"
  ) => {
    const { intervalDays, nextReviewDate } = calculateNextReview(rating);

    await onSessionComplete(planId, rating, intervalDays, nextReviewDate);

    onShowToast(
      `تم تقييم الحفظ بـ (${
        rating === "hard"
          ? "صعب"
          : rating === "medium"
          ? "متوسط"
          : rating === "easy"
          ? "سهل"
          : "متقن"
      }). المراجعة القادمة بعد ${intervalDays} يوم.`,
      "success"
    );
  };

  const steps: { id: StepType; label: string }[] = [
    { id: "listen", label: "١. استمع للآية" },
    { id: "read", label: "٢. اقرأ بتمهل" },
    { id: "hide", label: "٣. تكرار وإخفاء" },
    { id: "test", label: "٤. اختبار الذاكرة" },
    { id: "rate", label: "٥. تقييم الحفظ" },
  ];

  const getHiddenVerseText = () => {
    const words = getVerseWords(verseText);

    if (words.length === 0) {
      return verseText;
    }

    if (hideMode === "full") {
      return words.map(() => "●●●").join(" ");
    }

    if (hideMode === "first_word") {
      return words.map((word, index) => (index === 0 ? word : "●●●")).join(" ");
    }

    if (hideMode === "random") {
      return words.map((word, index) => (index % 2 === 1 ? "●●●" : word)).join(" ");
    }

    return verseText;
  };

  const goToNextStep = () => {
    const stepOrder: StepType[] = ["listen", "read", "hide", "test", "rate"];
    const currentIndex = stepOrder.indexOf(activeStep);

    if (currentIndex < stepOrder.length - 1) {
      setActiveStep(stepOrder[currentIndex + 1]);
    }
  };

  const goToVerse = (verseNumber: number) => {
    setCurrentVerse(verseNumber);
    setActiveStep("listen");
    setHideMode("none");
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 md:p-8 space-y-6 max-w-4xl mx-auto text-right font-sans shadow-lg animate-fade-in"
      dir="rtl"
    >
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <span className="text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-md font-bold mb-1.5 inline-block">
            جلسة مراجعة تكرارية نشطة
          </span>

          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <Award className="h-5.5 w-5.5 text-emerald-600" />
            <span>خطة: {planTitle}</span>
          </h2>

          <p className="text-xs text-slate-400 font-bold">
            الموضع: سورة {surahName} (آيات {startVerse} - {endVerse}) • الآية
            الحالية: {currentVerse}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border"
        >
          خروج من الجلسة
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-2.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border text-center">
        {steps.map((step) => {
          const isActive = activeStep === step.id;

          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`py-2 px-1 rounded-xl text-[9px] sm:text-xs font-bold transition cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[220px] bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border p-6 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-inner">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-7 w-7 text-emerald-600 animate-spin" />
            <span className="text-xs text-slate-400">
              تحميل الآية الكريمة ومحتويات الجلسة...
            </span>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {activeStep === "listen" && (
              <div className="space-y-4">
                <span className="text-[10px] text-slate-400 font-bold block">
                  استمع بإنصات وخشوع وركز في مخارج الحروف
                </span>

                <p className="font-quran text-slate-800 dark:text-white text-2xl leading-loose font-medium select-none max-w-2xl mx-auto">
                  {verseText}
                </p>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => onPlayAyah(surahId, currentVerse, verseText)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-100 dark:shadow-none"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>تشغيل التلاوة الصوتية</span>
                  </button>
                </div>
              </div>
            )}

            {activeStep === "read" && (
              <div className="space-y-4">
                <span className="text-[10px] text-slate-400 font-bold block">
                  اقرأ الآية من الشاشة بتمهل مع ضبط الحركات والمدود
                </span>

                <p className="font-quran text-slate-800 dark:text-white text-2xl leading-loose font-medium max-w-2xl mx-auto">
                  {verseText}
                </p>

                <p className="text-[10px] text-emerald-600 font-bold">
                  تكرار قراءة الآية نظراً عدة مرات يثبت شكلها في الذاكرة
                  البصرية.
                </p>
              </div>
            )}

            {activeStep === "hide" && (
              <div className="space-y-6">
                <span className="text-[10px] text-slate-400 font-bold block">
                  اختبر حفظك من خلال إخفاء الكلمات والاعتماد على الذاكرة
                </span>

                <p className="font-quran text-slate-800 dark:text-white text-2xl leading-loose font-medium max-w-2xl mx-auto select-none transition-all duration-300">
                  {getHiddenVerseText()}
                </p>

                <div className="flex justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => setHideMode("none")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      hideMode === "none"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    إظهار الكل
                  </button>

                  <button
                    onClick={() => setHideMode("random")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      hideMode === "random"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    إخفاء عشوائي
                  </button>

                  <button
                    onClick={() => setHideMode("first_word")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      hideMode === "first_word"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    الكلمة الأولى فقط
                  </button>

                  <button
                    onClick={() => setHideMode("full")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      hideMode === "full"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-slate-900"
                    }`}
                  >
                    إخفاء كامل الآية
                  </button>
                </div>
              </div>
            )}

            {activeStep === "test" && (
              <div className="space-y-5">
                <div className="flex justify-center gap-2.5 border-b pb-3 mb-3">
                  <button
                    onClick={() => setTestType("fill_blank")}
                    className={`pb-1 px-3 text-xs font-bold transition ${
                      testType === "fill_blank"
                        ? "text-emerald-600 border-b-2 border-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    أكمل الفراغ
                  </button>

                  <button
                    onClick={() => setTestType("scramble")}
                    className={`pb-1 px-3 text-xs font-bold transition ${
                      testType === "scramble"
                        ? "text-emerald-600 border-b-2 border-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    تركيب الكلمات
                  </button>

                  {!isLastVerseOfPlan && (
                    <button
                      onClick={() => setTestType("next_verse")}
                      className={`pb-1 px-3 text-xs font-bold transition ${
                        testType === "next_verse"
                          ? "text-emerald-600 border-b-2 border-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      الآية التالية
                    </button>
                  )}
                </div>

                {testType === "fill_blank" && (
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      اكتب الكلمة المحذوفة من الآية الكريمة
                    </span>

                    <p className="font-quran text-slate-800 dark:text-white text-xl leading-loose font-medium select-none max-w-2xl mx-auto">
                      {getVerseWords(verseText)
                        .map((word, index) =>
                          index === blankWordIndex ? "________" : word
                        )
                        .join(" ")}
                    </p>

                    <div className="flex justify-center gap-2 max-w-sm mx-auto">
                      <input
                        type="text"
                        value={blankAnswerInput}
                        onChange={(e) => {
                          setBlankAnswerInput(e.target.value);
                          setIsBlankCorrect(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleVerifyBlank();
                          }
                        }}
                        placeholder="الكلمة المفقودة..."
                        className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-xl flex-1 text-center"
                        id="blank-answer-input"
                      />

                      <button
                        onClick={handleVerifyBlank}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                      >
                        تحقق
                      </button>
                    </div>

                    {isBlankCorrect !== null && (
                      <div
                        className={`text-xs font-bold ${
                          isBlankCorrect ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {isBlankCorrect
                          ? "✓ إجابة صحيحة"
                          : "❌ حاول مرة أخرى، الإجابة غير مطابقة"}
                      </div>
                    )}
                  </div>
                )}

                {testType === "scramble" && (
                  <div className="space-y-5">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      انقر على الكلمات بالترتيب الصحيح لتركيب الآية الكريمة
                    </span>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-dashed rounded-xl min-h-[50px] flex flex-wrap gap-2 justify-center items-center">
                      {userArrangedWords.length === 0 ? (
                        <span className="text-[10px] text-slate-400">
                          ستظهر الكلمات المرتبة هنا...
                        </span>
                      ) : (
                        userArrangedWords.map((word, index) => (
                          <span
                            key={`${word}-${index}`}
                            className="font-quran text-base font-bold px-1 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md"
                          >
                            {word}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                      {scrambledWords.map((word) => (
                        <button
                          key={word.id}
                          disabled={word.isSelected}
                          onClick={() => handleWordClick(word.id, word.text)}
                          className={`px-3 py-1.5 border font-quran text-base rounded-xl transition cursor-pointer ${
                            word.isSelected
                              ? "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 border-dashed"
                              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:border-emerald-500"
                          }`}
                        >
                          {word.text}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleResetScramble}
                        className="px-3.5 py-1.5 text-xs font-bold border rounded-xl"
                      >
                        إعادة تعيين
                      </button>

                      <button
                        onClick={handleVerifyScramble}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        تأكيد الترتيب
                      </button>
                    </div>
                  </div>
                )}

                {testType === "next_verse" && (
                  <div className="space-y-4">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      ما هي الآية التالية المكملة لهذا الموضع؟
                    </span>

                    <div className="space-y-2 max-w-lg mx-auto">
                      {nextVerseOptions.map((option, index) => {
                        const isSelected = selectedNextOption === option;

                        return (
                          <button
                            key={`${option}-${index}`}
                            onClick={() => handleVerifyNextOption(option)}
                            disabled={selectedNextOption !== ""}
                            className={`w-full p-3 border rounded-xl text-right text-xs font-serif leading-relaxed transition flex items-center justify-between ${
                              selectedNextOption === ""
                                ? "bg-white dark:bg-slate-900 hover:border-emerald-500 hover:bg-emerald-50/10"
                                : isSelected
                                ? isNextOptionCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-bold"
                                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-400 font-bold"
                                : "bg-slate-50 dark:bg-slate-950 opacity-60"
                            }`}
                          >
                            <span>{option}</span>

                            {selectedNextOption !== "" && isSelected && (
                              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/50">
                                {isNextOptionCorrect ? "✓ صحيح" : "❌ خطأ"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeStep === "rate" && (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md font-bold inline-block mb-2">
                    الخطوة الأخيرة: صنف حفظك الآن
                  </span>

                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    سيقوم تطبيق أثر آية تلقائياً بجدولة تاريخ المراجعة القادم
                    وفقاً لخوارزمية جدولة التكرار المتباعد لتعزيز ثبات الحفظ.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                  <button
                    onClick={() => handleRateHifz("hard")}
                    className="p-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl transition text-center cursor-pointer space-y-1 group"
                  >
                    <span className="block text-xs font-bold text-rose-600 dark:text-rose-400">
                      صعب جداً 🛑
                    </span>
                    <span className="block text-[8px] text-slate-400">
                      تكرار غداً بعد يوم واحد
                    </span>
                  </button>

                  <button
                    onClick={() => handleRateHifz("medium")}
                    className="p-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl transition text-center cursor-pointer space-y-1 group"
                  >
                    <span className="block text-xs font-bold text-amber-600 dark:text-amber-400">
                      متوسط ⚠️
                    </span>
                    <span className="block text-[8px] text-slate-400">
                      تكرار بعد ٣ أيام
                    </span>
                  </button>

                  <button
                    onClick={() => handleRateHifz("easy")}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl transition text-center cursor-pointer space-y-1 group"
                  >
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      سهل نسبياً ✅
                    </span>
                    <span className="block text-[8px] text-slate-400">
                      تكرار بعد ٧ أيام
                    </span>
                  </button>

                  <button
                    onClick={() => handleRateHifz("mastered")}
                    className="p-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/10 dark:hover:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl transition text-center cursor-pointer space-y-1 group"
                  >
                    <span className="block text-xs font-bold text-purple-600 dark:text-purple-400">
                      متقن تماماً 🌟
                    </span>
                    <span className="block text-[8px] text-slate-400">
                      تكرار متباعد ١٤ - ٣٠ يوماً
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1">
          <button
            disabled={currentVerse === startVerse}
            onClick={() => goToVerse(currentVerse - 1)}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl border disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="text-xs font-bold text-slate-400">
            التالي والسابق بالآيات
          </span>

          <button
            disabled={isLastVerseOfPlan}
            onClick={() => goToVerse(currentVerse + 1)}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl border disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div>
          {activeStep !== "rate" ? (
            <button
              disabled={activeStep === "test" && !isTestCompleted}
              onClick={goToNextStep}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              <span>الخطوة التالية</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            !isLastVerseOfPlan && (
              <button
                onClick={() => {
                  goToVerse(currentVerse + 1);
                  onShowToast("الانتقال للآية التالية في الخطة", "info");
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
              >
                <span>الانتقال للآية التالية في الخطة</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}