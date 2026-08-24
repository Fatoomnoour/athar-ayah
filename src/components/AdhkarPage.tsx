import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../i18n";
import { User } from "../types";
import { ADHKAR_LIST, AdhkarCategory, AdhkarItem } from "../data/adhkar";
import { getCategoryItems, getNextIndex, getPreviousIndex, getNavigationIcon } from "../services/adhkarNavigation";
import { ChevronRight, ChevronLeft, RotateCcw, Share2, Heart, ExternalLink, Info, Check } from "lucide-react";

interface AdhkarPageProps {
  currentUser: User | null;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AdhkarPage({ currentUser, onShowToast }: AdhkarPageProps) {
  const { language, direction, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<AdhkarCategory>("morning");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [showSource, setShowSource] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Keep navigation scoped to the selected category so the counter and arrows
  // describe the user's current collection, not an unrelated category.
  const categoryItems = getCategoryItems(activeCategory);
  const currentItem = categoryItems[currentIndex];

  // Categories list
  const categories: { id: AdhkarCategory; nameAr: string; nameEn: string }[] = [
    { id: "morning", nameAr: "الصباح", nameEn: "Morning" },
    { id: "evening", nameAr: "المساء", nameEn: "Evening" },
    { id: "post_prayer", nameAr: "بعد الصلاة", nameEn: "Post Prayer" },
    { id: "sleep", nameAr: "النوم", nameEn: "Sleep" },
    { id: "waking", nameAr: "الاستيقاظ", nameEn: "Waking" },
    { id: "home", nameAr: "المنزل", nameEn: "Home" },
    { id: "travel", nameAr: "السفر", nameEn: "Travel" },
    { id: "forgiveness", nameAr: "الاستغفار", nameEn: "Forgiveness" },
    { id: "ruqyah", nameAr: "الرقية", nameEn: "Ruqyah" },
    { id: "quranic", nameAr: "قرآنية", nameEn: "Quranic" },
  ];

  // Load saved state from local storage on mount
  useEffect(() => {
    if (currentUser) {
      const savedCounts = localStorage.getItem(`adhkar_counts_${currentUser.id}`);
      const savedFavs = localStorage.getItem(`adhkar_favs_${currentUser.id}`);
      if (savedCounts) setCounts(JSON.parse(savedCounts));
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    }
  }, [currentUser]);

  // Save state when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`adhkar_counts_${currentUser.id}`, JSON.stringify(counts));
      localStorage.setItem(`adhkar_favs_${currentUser.id}`, JSON.stringify(favorites));
    }
  }, [counts, favorites, currentUser]);


  const handleCount = () => {
    if (!currentItem) return;
    const currentCount = counts[currentItem.id] || 0;
    if (currentCount < currentItem.repeatCount) {
      const newCount = currentCount + 1;
      setCounts(prev => ({ ...prev, [currentItem.id]: newCount }));

      // Haptic feedback if supported
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }

      if (newCount === currentItem.repeatCount) {
        // Automatically move to next after a short delay if completed
        if (currentIndex < categoryItems.length - 1) {
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            setShowSource(false);
          }, 600);
        }
      }
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem) return;
    setCounts(prev => ({ ...prev, [currentItem.id]: 0 }));
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem) return;
    setFavorites(prev => ({ ...prev, [currentItem.id]: !prev[currentItem.id] }));
    onShowToast(
      favorites[currentItem.id]
        ? (language === 'ar' ? "تمت الإزالة من المفضلة" : "Removed from favorites")
        : (language === 'ar' ? "تمت الإضافة للمفضلة" : "Added to favorites"),
      "info"
    );
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem) return;

    const textToShare = `${currentItem.arabicText}\n\n${currentItem.englishMeaning}\n\n${currentItem.sourceTitle}\n\nShared via Athar Ayah App`;
    const shareTitle = language === "ar" ? "ذكر من أثر آية" : "Athar Ayah Adhkar";

    try {
      // Prefer a shareable PNG generated from the canonical, read-only content.
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 760;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#f0fdf4";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#064e3b";
        context.textAlign = "center";
        context.direction = "rtl";
        context.font = "bold 34px serif";
        const words = currentItem.arabicText.split(" ");
        const lines: string[] = [];
        let line = "";
        words.forEach((word) => {
          const candidate = line ? `${line} ${word}` : word;
          if (context.measureText(candidate).width > 1040 && line) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        });
        if (line) lines.push(line);
        lines.slice(0, 5).forEach((value, index) => context.fillText(value, 600, 150 + index * 58));
        context.direction = "ltr";
        context.font = "22px sans-serif";
        context.fillStyle = "#334155";
        context.fillText(currentItem.sourceTitle, 600, 540);
        context.font = "18px sans-serif";
        context.fillStyle = "#64748b";
        context.fillText("Athar Ayah", 600, 610);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        const imageFile = blob ? new File([blob], "athar-ayah-adhkar.png", { type: "image/png" }) : null;
        if (imageFile && navigator.share && navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({ title: shareTitle, text: textToShare, files: [imageFile] });
          return;
        }
        if (imageFile) {
          const downloadUrl = URL.createObjectURL(imageFile);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = imageFile.name;
          link.click();
          URL.revokeObjectURL(downloadUrl);
          onShowToast(language === "ar" ? "تم تنزيل صورة الذكر" : "Adhkar image downloaded", "success");
          return;
        }
      }

      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: textToShare });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToShare);
        onShowToast(language === "ar" ? "تم نسخ النص" : "Text copied to clipboard", "success");
      }
    } catch (err) {
      if ((err as DOMException).name !== "AbortError") {
        console.error("Error sharing adhkar", err);
        onShowToast(language === "ar" ? "تعذر مشاركة الذكر" : "Unable to share adhkar", "error");
      }
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < categoryItems.length - 1) {
      setCurrentIndex(prev => getNextIndex(prev, categoryItems.length));
      setShowSource(false);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => getPreviousIndex(prev, categoryItems.length));
      setShowSource(false);
    }
  };

  if (!currentItem) {
    return (
      <div className="p-8 text-center text-slate-500">
        {language === 'ar' ? "لا توجد أذكار في هذا القسم حالياً." : "No adhkar available in this category yet."}
      </div>
    );
  }

  const currentCount = counts[currentItem.id] || 0;
  const isCompleted = currentCount >= currentItem.repeatCount;
  const progressPercent = (currentCount / currentItem.repeatCount) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20" dir={direction}>

      {/* Categories Scrollable Bar */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
        <div className="flex gap-2 w-max">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                const firstIndex = ADHKAR_LIST.findIndex((item) => item.category === cat.id);
                if (firstIndex >= 0) {
                  setActiveCategory(cat.id);
                  setCurrentIndex(0);
                  setShowSource(false);
                }
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {language === 'ar' ? cat.nameAr : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div
        ref={cardRef}
        onClick={handleCount}
        className={`relative bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 cursor-pointer select-none ${
          isCompleted
            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10"
            : "border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50"
        }`}
      >
        {/* Progress Background */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-emerald-100/50 dark:bg-emerald-900/20 transition-all duration-300 ease-out"
          style={{ height: `${progressPercent}%`, zIndex: 0 }}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col min-h-[400px]">

          {/* Top Bar */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-slate-400">
              {currentIndex + 1} / {categoryItems.length}
            </span>
            <div className="flex gap-2">
              <button onClick={handleShare} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={handleToggleFavorite} className={`p-2 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${favorites[currentItem.id] ? "text-rose-500" : "text-slate-400 hover:text-rose-500"}`}>
                <Heart className="w-4 h-4" fill={favorites[currentItem.id] ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 flex flex-col justify-center space-y-8 my-4">
            <p className="text-2xl md:text-3xl leading-[1.8] md:leading-[1.8] text-slate-800 dark:text-slate-100 font-quran text-center" dir="rtl">
              {currentItem.arabicText}
            </p>

            {language === 'en' && (
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 text-center leading-relaxed font-serif" dir="ltr">
                {currentItem.englishMeaning}
              </p>
            )}
          </div>

          {/* Source Info Toggle */}
          <div className="mt-auto pt-6">
            <button
              onClick={(e) => { e.stopPropagation(); setShowSource(!showSource); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors mx-auto mb-4"
            >
              <Info className="w-3.5 h-3.5" />
              {language === 'ar' ? "المصدر والمرجع" : "Source & Reference"}
            </button>

            {showSource && (
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 space-y-1 mb-6 text-center border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2" onClick={e => e.stopPropagation()}>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">{currentItem.sourceTitle}</p>
                <p>{currentItem.reference}</p>
                {currentItem.notes && <p className="italic">{currentItem.notes}</p>}
                {currentItem.sourceUrl && (
                  <a href={currentItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline mt-1">
                    {language === 'ar' ? "رابط المصدر" : "Source Link"} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[9px]">
                  {language === 'ar' ? "التدبر الشخصي ليس تفسيراً شرعياً." : "Personal reflection is not scholarly tafsir."}
                </div>
              </div>
            )}

            {/* Counter and Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label={language === "ar" ? "الذكر السابق" : "Previous dhikr"}
                title={language === "ar" ? "الذكر السابق" : "Previous dhikr"}
                className="p-3 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {getNavigationIcon(direction, "previous") === "right" ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
              </button>

              <div className="flex flex-col items-center gap-2">
                <div className={`text-3xl font-black tabular-nums transition-colors ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                  {currentCount} <span className="text-lg text-slate-300 dark:text-slate-600 mx-1">/</span> {currentItem.repeatCount}
                </div>

                {isCompleted ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    {language === 'ar' ? "مكتمل" : "Completed"}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {language === 'ar' ? "اضغط للعد" : "Tap to count"}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {currentCount > 0 && (
                  <button
                    onClick={handleReset}
                    className="p-3 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 animate-in zoom-in"
                    title={language === 'ar' ? "إعادة الضبط" : "Reset"}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={currentIndex === categoryItems.length - 1}
                  aria-label={language === "ar" ? "الذكر التالي" : "Next dhikr"}
                  title={language === "ar" ? "الذكر التالي" : "Next dhikr"}
                  className="p-3 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {getNavigationIcon(direction, "next") === "left" ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
