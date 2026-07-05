import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Bookmark, BookMarked, Sparkles, Award, 
  ChevronLeft, ChevronRight, Maximize2, Minimize2, 
  Type, Heart, Plus, Loader, Info, HelpCircle, Eye, EyeOff,
  Search, Sliders, Sun, Moon, Grid, List, Smile, Share2, Play, Repeat, X, ArrowRight
} from "lucide-react";
import { SURAH_LIST, JUZ_LIST, JUZ_STARTING_POSITIONS, SURAH_VERSE_COUNTS, getAbsoluteAyah } from "../utils/quranUtils";
import { User, Bookmark as BookmarkType, QuranNote, MemorizationPlan } from "../types";
import { 
  createNote, 
  getUserNotes, 
  createBookmark, 
  getUserBookmarks, 
  deleteBookmark, 
  saveReadingProgress, 
  createMemorizationPlan 
} from "../services/firestoreService";

interface QuranReaderProps {
  key?: React.Key | string | number;
  currentUser: User | null;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  onRefreshStats: () => void;
  onPlayAyah: (surahId: number, verseNumber: number, text: string) => void;
  initialSurahId?: number;
  initialVerseNumber?: number;
  focusMode?: boolean;
  setFocusMode?: (val: boolean) => void;
}

export default function QuranReader({ 
  currentUser, 
  onShowToast, 
  onRefreshStats,
  onPlayAyah,
  initialSurahId,
  initialVerseNumber,
  focusMode: propsFocusMode,
  setFocusMode: propsSetFocusMode
}: QuranReaderProps) {
  
  // Navigation State
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [selectedJuz, setSelectedJuz] = useState<number>(1);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectionType, setSelectionType] = useState<"surah" | "page">("surah");

  // Quran Content State (Continuous list of verses)
  const [verses, setVerses] = useState<any[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(false);
  
  // Customization & Display Settings
  const [fontSize, setFontSize] = useState<number>(36); // Amiri Quran text size increased significantly
  const [lineSpacing, setLineSpacing] = useState<"tight" | "medium" | "loose">("medium");
  
  // Focus Mode binding
  const [localFocusMode, setLocalFocusMode] = useState<boolean>(false);
  const focusMode = propsFocusMode !== undefined ? propsFocusMode : localFocusMode;
  const setFocusMode = propsSetFocusMode !== undefined ? propsSetFocusMode : setLocalFocusMode;
  const [readerTheme, setReaderTheme] = useState<"ivory" | "white" | "dark">("ivory");
  const [readerMode, setReaderMode] = useState<"mushaf" | "verse" | "memorize">("mushaf");

  // Memorize Mode specific state
  const [revealAllHifz, setRevealAllHifz] = useState<boolean>(false);
  const [revealedWords, setRevealedWords] = useState<Record<string, boolean>>({});

  // Active clicked verse for actions bottom sheet / sidebar
  const [activeVerse, setActiveVerse] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<"tafsir" | "words" | "reflections" | "memorization">("tafsir");
  
  // Tafsir Source and State
  const [tafsirSource, setTafsirSource] = useState<"ar.muyassar" | "ar.jalalayn">("ar.muyassar");
  const [tafsirText, setTafsirText] = useState<string>("");
  const [isLoadingTafsir, setIsLoadingTafsir] = useState<boolean>(false);

  // Word meanings
  const [words, setWords] = useState<any[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState<boolean>(false);

  // Reflections state
  const [reflections, setReflections] = useState<QuranNote[]>([]);
  const [newReflection, setNewReflection] = useState<string>("");
  const [newReflectionTags, setNewReflectionTags] = useState<string>("");
  const [noteTitle, setNoteTitle] = useState<string>("");
  const [noteLesson, setNoteLesson] = useState<string>("");
  const [noteActionStep, setNoteActionStep] = useState<string>("");
  const [noteDua, setNoteDua] = useState<string>("");
  const [noteColor, setNoteColor] = useState<string>("bg-emerald-500/10");
  const [isNotePinned, setIsNotePinned] = useState<boolean>(false);
  const [isNotePrivate, setIsNotePrivate] = useState<boolean>(true);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState<boolean>(false);

  // Bookmarked check for active verse
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // Memorization setup for active verse
  const [memoPlanTitle, setMemoPlanTitle] = useState<string>("");
  const [memoEndVerse, setMemoEndVerse] = useState<number>(1);
  const [memoTargetDate, setMemoTargetDate] = useState<string>("");
  const [isCreatingMemo, setIsCreatingMemo] = useState<boolean>(false);

  // Search Engine state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Left sidebar Surah list drawer
  const [isSurahDrawerOpen, setIsSurahDrawerOpen] = useState<boolean>(false);

  // Refs for auto scrolling/focusing
  const activeVerseRef = useRef<HTMLDivElement | null>(null);

  // 1. Initialize and handle dashboard Jumps
  useEffect(() => {
    if (initialSurahId) {
      setSelectedSurah(initialSurahId);
      if (initialVerseNumber) {
        setSelectedVerse(initialVerseNumber);
      } else {
        setSelectedVerse(1);
      }
      setSelectionType("surah");
    } else {
      // Load last read position from localstorage if any
      if (currentUser) {
        const saved = localStorage.getItem(`last_read_${currentUser.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSelectedSurah(parsed.surahId || 1);
            setSelectedVerse(parsed.verseNum || 1);
          } catch (e) {}
        }
      }
    }
  }, [initialSurahId, initialVerseNumber]);

  // 2. Fetch Quran Text (Surah or Page)
  useEffect(() => {
    fetchQuranText();
  }, [selectedSurah, selectedPage, selectionType]);

  // 3. Keep selectedJuz in sync when surah/page loads
  useEffect(() => {
    if (verses.length > 0 && verses[0].juz) {
      setSelectedJuz(verses[0].juz);
    }
  }, [verses]);

  // 4. Fetch details for the active clicked verse
  useEffect(() => {
    if (activeVerse) {
      if (detailTab === "tafsir") fetchTafsir();
      if (detailTab === "words") fetchWordMeanings();
      if (detailTab === "reflections") fetchVerseReflections();
      checkBookmarkStatus();
    }
  }, [activeVerse, detailTab, tafsirSource]);

  // Auto-fill memorization end verse limit when active verse changes
  useEffect(() => {
    if (activeVerse) {
      const currentSurahId = activeVerse.surahId || selectedSurah;
      const maxVerses = SURAH_VERSE_COUNTS[currentSurahId - 1] || 1;
      setMemoEndVerse(Math.min(activeVerse.numberInSurah + 5, maxVerses));
      setMemoPlanTitle(`حفظ سورة ${SURAH_LIST[currentSurahId - 1]?.name} من آية ${activeVerse.numberInSurah}`);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      setMemoTargetDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [activeVerse]);

  // Fetch Quran Verses according to selection
  const fetchQuranText = async () => {
    setIsLoadingVerses(true);
    try {
      let url = "";
      if (selectionType === "surah") {
        url = `https://api.alquran.cloud/v1/surah/${selectedSurah}/quran-uthmani`;
      } else {
        url = `https://api.alquran.cloud/v1/page/${selectedPage}/quran-uthmani`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        if (selectionType === "surah") {
          // Surah response format
          const formatted = result.data.ayahs.map((ayah: any) => ({
            ...ayah,
            surahId: selectedSurah,
            surahName: result.data.name
          }));
          setVerses(formatted);
          if (formatted.length > 0 && selectionType === "surah") {
            setSelectedPage(formatted[0].page);
          }
        } else {
          // Page response format
          const formatted = result.data.ayahs.map((ayah: any) => {
            // Extract surah id from absolute ayah number or ayah object if available
            // Note: api.alquran.cloud includes surah info inside ayah.surah
            return {
              ...ayah,
              surahId: ayah.surah.number,
              surahName: ayah.surah.name
            };
          });
          setVerses(formatted);
        }
      } else {
        onShowToast("خطأ أثناء تحميل آيات القرآن من الخادم الموثق", "error");
      }
    } catch (err) {
      console.error(err);
      onShowToast("فشل الاتصال بخادم القرآن. تحقق من اتصالك بالإنترنت", "error");
    } finally {
      setIsLoadingVerses(false);
    }
  };

  // Fetch Tafsir for active verse
  const fetchTafsir = async () => {
    if (!activeVerse) return;
    setIsLoadingTafsir(true);
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const verseKey = `${surahId}:${activeVerse.numberInSurah}`;
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${verseKey}/${tafsirSource}`);
      if (res.ok) {
        const result = await res.json();
        setTafsirText(result.data?.text || "");
      } else {
        setTafsirText("عذراً، فشل تحميل التفسير لهذا الموضع.");
      }
    } catch (err) {
      console.error(err);
      setTafsirText("خطأ في الشبكة أثناء جلب التفسير المعتمد.");
    } finally {
      setIsLoadingTafsir(false);
    }
  };

  // Fetch Word by Word translations
  const fetchWordMeanings = async () => {
    if (!activeVerse) return;
    setIsLoadingWords(true);
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const verseKey = `${surahId}:${activeVerse.numberInSurah}`;
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_key/${verseKey}?words=true&language=ar`);
      if (res.ok) {
        const result = await res.json();
        setWords(result.verse?.words || []);
      } else {
        setWords([]);
      }
    } catch (err) {
      console.error(err);
      setWords([]);
    } finally {
      setIsLoadingWords(false);
    }
  };

  // Fetch Personal reflections
  const fetchVerseReflections = async () => {
    if (!currentUser || !activeVerse) return;
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const notes = await getUserNotes(currentUser.id, surahId);
      const filtered = notes.filter((n) => n.verseNumber === activeVerse.numberInSurah);
      setReflections(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  // Check if active verse is bookmarked
  const checkBookmarkStatus = async () => {
    if (!currentUser || !activeVerse) return;
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const bookmarks = await getUserBookmarks(currentUser.id);
      const found = bookmarks.some(
        (b) => b.surahId === surahId && b.verseNumber === activeVerse.numberInSurah
      );
      setIsBookmarked(found);
    } catch (err) {}
  };

  // Place reading bookmark / Last read position
  const handlePlaceReadingBookmark = async (ayah: any) => {
    if (!currentUser) {
      onShowToast("الرجاء تسجيل الدخول أولاً لحفظ الموضع", "error");
      return;
    }
    try {
      const surahId = ayah.surahId || selectedSurah;
      const surahName = SURAH_LIST[surahId - 1]?.name || "القرآن";
      
      await saveReadingProgress(currentUser.id, {
        userId: currentUser.id,
        lastSurahId: surahId,
        lastSurahName: surahName,
        lastVerseNumber: ayah.numberInSurah
      });

      localStorage.setItem(`last_read_${currentUser.id}`, JSON.stringify({
        surahId,
        verseNum: ayah.numberInSurah,
        surahName
      }));
      onShowToast(`تم حفظ فاصل القراءة عند سورة ${surahName} آية ${ayah.numberInSurah}`, "success");
      onRefreshStats();
    } catch (err) {
      console.error(err);
      onShowToast("فشل حفظ علامة المتابعة", "error");
    }
  };

  // Toggle Bookmark for active verse
  const handleToggleBookmark = async () => {
    if (!currentUser || !activeVerse) return;
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const surahName = SURAH_LIST[surahId - 1]?.name || "";
      
      const bookmarks = await getUserBookmarks(currentUser.id);
      const existing = bookmarks.find(
        (b) => b.surahId === surahId && b.verseNumber === activeVerse.numberInSurah
      );

      if (existing) {
        await deleteBookmark(currentUser.id, existing.id);
        setIsBookmarked(false);
        onShowToast("تم إزالة الآية من المفضلة", "info");
      } else {
        await createBookmark(currentUser.id, {
          userId: currentUser.id,
          surahId,
          surahName,
          verseNumber: activeVerse.numberInSurah,
          note: "تم التثبيت من المصحف الشريف"
        });
        setIsBookmarked(true);
        onShowToast("تم حفظ الآية في المفضلة!", "success");
      }
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Reflection
  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeVerse) return;
    if (!newReflection.trim()) return;

    setIsSubmittingReflection(true);
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const surahName = SURAH_LIST[surahId - 1]?.name || "";
      const tagsArray = newReflectionTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await createNote(currentUser.id, {
        userId: currentUser.id,
        surahId,
        surahName,
        verseNumber: activeVerse.numberInSurah,
        verseKey: `${surahId}:${activeVerse.numberInSurah}`,
        verseText: activeVerse.text,
        title: noteTitle,
        reflectionText: newReflection,
        lesson: noteLesson,
        actionStep: noteActionStep,
        dua: noteDua,
        color: noteColor,
        pinned: isNotePinned,
        isPrivate: isNotePrivate,
        isFavorite: false,
        tags: tagsArray
      });

      setNewReflection("");
      setNewReflectionTags("");
      setNoteTitle("");
      setNoteLesson("");
      setNoteActionStep("");
      setNoteDua("");
      setNoteColor("bg-emerald-500/10");
      setIsNotePinned(false);
      setIsNotePrivate(true);
      onShowToast("تم حفظ تدبرك بنجاح", "success");
      fetchVerseReflections();
      onRefreshStats();
    } catch (err) {
      console.error(err);
      onShowToast("خطأ أثناء تدوين التدبر", "error");
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  // Create Memorization Plan
  const handleCreateMemorizationPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeVerse) return;
    if (!memoPlanTitle.trim() || !memoTargetDate) {
      onShowToast("يرجى تعبئة جميع حقول خطة الحفظ", "error");
      return;
    }

    setIsCreatingMemo(true);
    try {
      const surahId = activeVerse.surahId || selectedSurah;
      const surahName = SURAH_LIST[surahId - 1]?.name || "";
      await createMemorizationPlan(currentUser.id, {
        userId: currentUser.id,
        title: memoPlanTitle,
        surahId,
        surahName,
        startVerse: activeVerse.numberInSurah,
        endVerse: memoEndVerse,
        targetDate: memoTargetDate
      });

      onShowToast("تم إنشاء خطة الحفظ والتكرار بنجاح! 🌟", "success");
      onRefreshStats();
      setDetailTab("tafsir");
    } catch (err) {
      console.error(err);
      onShowToast("فشل إنشاء الخطة", "error");
    } finally {
      setIsCreatingMemo(false);
    }
  };

  // Full Quran Word Search Engine
  const handleQuranSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(searchQuery)}/all/quran-uthmani`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data?.matches || []);
        if ((data.data?.matches || []).length === 0) {
          onShowToast("لم يتم العثور على نتائج مطابقة للكلمة المدخلة", "info");
        } else {
          onShowToast(`تم العثور على ${data.data.matches.length} نتيجة مطابقة`, "success");
        }
      } else {
        onShowToast("فشل البحث في المصحف، تأكد من الاتصال", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Navigate to Specific search result
  const handleSelectSearchResult = (result: any) => {
    setSelectedSurah(result.surah.number);
    setSelectedVerse(result.numberInSurah);
    setSelectionType("surah");
    setIsSearchOpen(false);
    
    // Auto click/focus this verse
    const matchedAyahObj = {
      text: result.text,
      numberInSurah: result.numberInSurah,
      surahId: result.surah.number,
      surahName: result.surah.name
    };
    setActiveVerse(matchedAyahObj);
    setIsDetailsOpen(true);
  };

  // Quick Juz Jumper
  const handleJuzChange = (juzNum: number) => {
    setSelectedJuz(juzNum);
    const start = JUZ_STARTING_POSITIONS[juzNum];
    if (start) {
      setSelectedSurah(start.surahId);
      setSelectedVerse(start.verseNumber);
      setSelectionType("surah");
      onShowToast(`تم الانتقال للجزء ${juzNum}`, "info");
    }
  };

  // Quick Page Jumper
  const handlePageChange = (pageNum: number) => {
    setSelectedPage(pageNum);
    setSelectionType("page");
    onShowToast(`تم الانتقال للصفحة ${pageNum}`, "info");
  };

  // Surah navigation buttons
  const handlePrevSurah = () => {
    if (selectedSurah > 1) {
      setSelectedSurah(selectedSurah - 1);
      setSelectedVerse(1);
    }
  };

  const handleNextSurah = () => {
    if (selectedSurah < 114) {
      setSelectedSurah(selectedSurah + 1);
      setSelectedVerse(1);
    }
  };

  // Word clicking in Memorize Mode (Active recall)
  const handleToggleWordReveal = (wordKey: string) => {
    setRevealedWords(prev => ({
      ...prev,
      [wordKey]: !prev[wordKey]
    }));
  };

  // Share Verse
  const handleShareVerse = (ayah: any) => {
    const surahId = ayah.surahId || selectedSurah;
    const surahName = SURAH_LIST[surahId - 1]?.name || "";
    const textToCopy = `"${ayah.text}" [سورة ${surahName} : آية ${ayah.numberInSurah}] - عبر تطبيق أثر آية لتدبر القرآن الكريم`;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => onShowToast("تم نسخ نص الآية الكريمة وتنسيقها لمشاركتها!", "success"))
      .catch(() => onShowToast("فشل نسخ النص", "error"));
  };

  // Line spacing class helper
  const getLineSpacingClass = () => {
    if (lineSpacing === "tight") return "leading-[2.5] py-4";
    if (lineSpacing === "loose") return "leading-[4] py-8";
    return "leading-[3.2] py-6";
  };

  // Theme styling configurations
  const getThemeColors = () => {
    if (readerTheme === "dark") return "bg-slate-950 text-slate-100 border-slate-900";
    if (readerTheme === "ivory") return "bg-[#FAF7F0] text-slate-900 border-[#eae3d2]";
    return "bg-white text-slate-900 border-slate-200";
  };

  // Clean Uthmani text of bismillah at the beginning of Surahs
  const getCleanAyahText = (ayah: any) => {
    let cleanText = ayah.text;
    if (ayah.numberInSurah === 1 && selectedSurah !== 1 && selectedSurah !== 9 && selectionType === "surah") {
      if (cleanText.startsWith("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")) {
        cleanText = cleanText.substring("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ".length).trim();
      }
    }
    return cleanText;
  };

  return (
    <div className={`rounded-2xl border transition-colors duration-300 font-sans shadow-sm overflow-hidden ${getThemeColors()}`}>
      
      {/* 1. Header Toolbar Settings */}
      {!focusMode && (
        <div className="border-b px-4 py-3 bg-white/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 select-none">
          <div className="flex items-center gap-2.5">
            {/* Surah List Drawer Button */}
            <button
              onClick={() => setIsSurahDrawerOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>فهرس السور</span>
            </button>

            {/* Play Audio Button */}
            <button
              onClick={() => {
                if (verses && verses.length > 0) {
                  const firstAyah = verses[0];
                  onPlayAyah(firstAyah.surahId || selectedSurah, firstAyah.numberInSurah, firstAyah.text);
                } else {
                  onPlayAyah(selectedSurah, 1, "");
                }
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="تلاوة صوتية للصفحة أو السورة الحالية"
            >
              <Play className="h-4 w-4" />
              <span>تلاوة صوتية</span>
            </button>

            {/* Selection mode Tabs */}
            <div className="flex border rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setSelectionType("surah")}
                className={`px-3 py-1 font-bold rounded-md transition ${selectionType === "surah" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                بالسورة
              </button>
              <button
                onClick={() => setSelectionType("page")}
                className={`px-3 py-1 font-bold rounded-md transition ${selectionType === "page" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                بالصفحة
              </button>
            </div>
          </div>

          {/* Core Selectors and jump bars */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Surah Selector if surah type */}
            {selectionType === "surah" && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">السورة:</span>
                <select
                  value={selectedSurah}
                  onChange={(e) => {
                    setSelectedSurah(Number(e.target.value));
                    setSelectedVerse(1);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer max-w-[120px]"
                >
                  {SURAH_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id}. {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Page Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">الصفحة:</span>
              <select
                value={selectedPage}
                onChange={(e) => handlePageChange(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {Array.from({ length: 604 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Juz Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">الجزء:</span>
              <select
                value={selectedJuz}
                onChange={(e) => handleJuzChange(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {JUZ_LIST.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.id}. {j.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Launcher */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
              title="بحث في الآيات والكلمات"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Focus Mode Prominent Launcher */}
            <button
              onClick={() => setFocusMode(true)}
              className="px-3 py-1.5 bg-slate-950 dark:bg-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              title="تفعيل وضع التركيز الكامل"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">وضع التركيز</span>
            </button>

            {/* Layout Setting Controls dropdown panel */}
            <div className="relative group">
              <button
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                title="إعدادات القراءة والمظهر"
              >
                <Sliders className="h-4 w-4" />
              </button>
              
              {/* Dropdown elements */}
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl shadow-lg p-4 space-y-4 hidden group-focus-within:block group-hover:block z-50">
                <h4 className="text-xs font-black text-slate-500 border-b pb-1.5 flex items-center gap-1">
                  <Sliders className="h-3.5 w-3.5" />
                  خيارات القراءة والمظهر
                </h4>

                {/* Font Size */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400">حجم الخط:</span>
                    <span className="font-black text-emerald-600">{fontSize}px</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                      className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border text-xs font-black rounded-md cursor-pointer"
                    >
                      أصغر -
                    </button>
                    <button
                      onClick={() => setFontSize(Math.min(48, fontSize + 2))}
                      className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border text-xs font-black rounded-md cursor-pointer"
                    >
                      أكبر +
                    </button>
                  </div>
                </div>

                {/* Reader Theme selection */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 block">لون الصفحة:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setReaderTheme("white")}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${readerTheme === "white" ? "border-emerald-500 bg-slate-50 text-emerald-600" : "bg-white text-slate-900"}`}
                    >
                      أبيض
                    </button>
                    <button
                      onClick={() => setReaderTheme("ivory")}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${readerTheme === "ivory" ? "border-emerald-500 bg-amber-50 text-emerald-700" : "bg-[#fcf8f2] text-[#5e4b3c]"}`}
                    >
                      عاجي
                    </button>
                    <button
                      onClick={() => setReaderTheme("dark")}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer bg-slate-900 text-slate-100 ${readerTheme === "dark" ? "border-emerald-400 text-emerald-400" : ""}`}
                    >
                      ليلي
                    </button>
                  </div>
                </div>

                {/* Line Spacing */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 block">تباعد السطور:</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setLineSpacing("tight")}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${lineSpacing === "tight" ? "bg-emerald-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                    >
                      ضيق
                    </button>
                    <button
                      onClick={() => setLineSpacing("medium")}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${lineSpacing === "medium" ? "bg-emerald-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                    >
                      متوسط
                    </button>
                    <button
                      onClick={() => setLineSpacing("loose")}
                      className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${lineSpacing === "loose" ? "bg-emerald-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
                    >
                      واسع
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick reader mode selectors (Mushaf, Verse list, Memorize recall) */}
            <div className="flex border rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={() => setReaderMode("mushaf")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 font-bold rounded-md transition ${readerMode === "mushaf" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                title="وضع المصحف (متواصل)"
              >
                <BookOpen className="h-4 w-4" />
                <span>المصحف</span>
              </button>
              <button
                onClick={() => setReaderMode("verse")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 font-bold rounded-md transition ${readerMode === "verse" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                title="وضع الآيات (قائمة مجزأة)"
              >
                <List className="h-4 w-4" />
                <span>الآيات</span>
              </button>
              <button
                onClick={() => setReaderMode("memorize")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 font-bold rounded-md transition ${readerMode === "memorize" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                title="وضع التسميع والحفظ (إخفاء الكلمات)"
              >
                <Award className="h-4 w-4" />
                <span>التسميع النشط</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. MAIN READING FRAME & INTERACTIVE CONTAINER */}
      <div className="flex flex-col lg:flex-row min-h-[550px] relative">
        
        {/* Left Column / Primary Quran Text Stage (Wider container with increased vertical height) */}
        <div className="flex-1 p-2 sm:p-5 lg:p-6 flex flex-col justify-between overflow-y-auto max-h-[850px] scrollbar-thin">
          
          {/* Immersive Focus Mode exit & controls banner */}
          {focusMode && (
            <div className="mb-6 flex flex-wrap items-center justify-between bg-emerald-500/5 dark:bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 gap-3 text-right">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  وضع التركيز نشط (اختر أي آية لعرض التفاصيل)
                </span>
              </div>
              
              <div className="flex items-center gap-2 select-none">
                {/* Surah Index Button - Focus mode compliant */}
                <button
                  onClick={() => setIsSurahDrawerOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="فهرس السور"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>فهرس السور</span>
                </button>

                {/* Audio Playback Button - Focus mode compliant */}
                <button
                  onClick={() => {
                    if (verses && verses.length > 0) {
                      const firstAyah = verses[0];
                      onPlayAyah(firstAyah.surahId || selectedSurah, firstAyah.numberInSurah, firstAyah.text);
                    } else {
                      onPlayAyah(selectedSurah, 1, "");
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="تلاوة السورة / الصفحة الحالية"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>التلاوة الصوتية</span>
                </button>

                {/* Exit Focus Mode Button */}
                <button
                  onClick={() => setFocusMode(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>إنهاء التركيز</span>
                </button>
              </div>
            </div>
          )}

          {/* Surah Details Banner & Bismillah (Prominent, stylized banner above Quran text) */}
          {!isLoadingVerses && verses.length > 0 && (
            <div className="text-center mb-8 space-y-5 select-none w-full max-w-3xl mx-auto">
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600/5 via-emerald-600/10 to-emerald-600/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl py-6 px-8 shadow-xs">
                {/* Decorative background visual objects */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-md -mr-4 -mt-4"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-lg -ml-6 -mb-6"></div>

                <div className="relative z-10 space-y-2">
                  {selectionType === "surah" ? (
                    <>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                        ترتيبها: {selectedSurah} • الجزء {selectedJuz}
                      </div>
                      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-inherit drop-shadow-xs">
                        سورة {SURAH_LIST[selectedSurah - 1]?.name}
                      </h1>
                      <div className="flex items-center justify-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                        <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
                          {SURAH_LIST[selectedSurah - 1]?.type}
                        </span>
                        <span>•</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold">
                          {SURAH_LIST[selectedSurah - 1]?.verses} آية كريمة
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        تلاوة مباركة • الجزء {selectedJuz}
                      </div>
                      <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-inherit">
                        الصفحة {selectedPage} من المصحف الشريف
                      </h1>
                    </>
                  )}
                </div>
              </div>

              {/* Bismillah Banner if not Tawbah and Fatiha */}
              {selectionType === "surah" && selectedSurah !== 1 && selectedSurah !== 9 && (
                <div className="text-3xl sm:text-4xl font-serif tracking-wide font-black py-4 block select-none drop-shadow-sm leading-relaxed max-w-xl mx-auto text-inherit">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
              )}
            </div>
          )}

          {/* Active Loading indicator */}
          {isLoadingVerses ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3.5">
              <Loader className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-xs text-slate-400 font-bold">جاري تحميل الآيات المباركة بالخط العثماني الموثق...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* RENDER VIEW ACCORDING TO SELECTED READER MODE */}

              {/* A. MUSHAF MODE (Traditional continuous text flow - Centered and comfortable to read) */}
              {readerMode === "mushaf" && (
                <div 
                  className={`text-center ${getLineSpacingClass()} font-serif px-2 sm:px-6 leading-relaxed tracking-wide max-w-5xl mx-auto`}
                  style={{ fontSize: `${fontSize}px` }}
                  dir="rtl"
                >
                  {verses.map((ayah) => {
                    const isSelected = activeVerse?.numberInSurah === ayah.numberInSurah && activeVerse?.surahId === ayah.surahId;
                    return (
                      <span 
                        key={`${ayah.surahId}-${ayah.number}`}
                        onClick={() => {
                          setActiveVerse(ayah);
                          setIsDetailsOpen(true);
                        }}
                        className={`font-quran cursor-pointer rounded-xl px-2 py-1 inline-block transition-all duration-200 ${
                          isSelected 
                            ? "bg-emerald-500/20 dark:bg-emerald-500/35 text-emerald-800 dark:text-emerald-200 font-bold scale-102 ring-2 ring-emerald-500/30" 
                            : "hover:bg-emerald-500/10"
                        }`}
                      >
                        {getCleanAyahText(ayah)}
                        <span className="inline-block text-emerald-600 dark:text-emerald-400 font-serif text-[0.85em] font-black mr-2 ml-1.5 select-none hover:scale-110 transition duration-150">
                          ﴿{ayah.numberInSurah}﴾
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* B. VERSE LIST MODE (Card layout verse by verse) */}
              {readerMode === "verse" && (
                <div className="space-y-4 max-w-5xl mx-auto">
                  {verses.map((ayah) => {
                    const isSelected = activeVerse?.numberInSurah === ayah.numberInSurah && activeVerse?.surahId === ayah.surahId;
                    return (
                      <div
                        key={`${ayah.surahId}-${ayah.number}`}
                        onClick={() => {
                          setActiveVerse(ayah);
                        }}
                        className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? "bg-emerald-500/5 border-emerald-500/40 dark:border-emerald-600/50 shadow-sm" 
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 hover:border-slate-200"
                        }`}
                      >
                        {/* Top row: surah:verse tag and actions shortcuts */}
                        <div className="flex justify-between items-center mb-4 text-xs">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                            {ayah.surahName || SURAH_LIST[ayah.surahId - 1]?.name} | آية {ayah.numberInSurah}
                          </span>
                          
                          <div className="flex items-center gap-1.5 select-none" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onPlayAyah(ayah.surahId, ayah.numberInSurah, ayah.text)}
                              className="p-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-md transition"
                              title="تلاوة الآية"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handlePlaceReadingBookmark(ayah)}
                              className="p-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-md transition"
                              title="حفظ موضع الفاصل المرجعي"
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleShareVerse(ayah)}
                              className="p-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 rounded-md transition"
                              title="مشاركة"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveVerse(ayah);
                                setDetailTab("tafsir");
                                setIsDetailsOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white border font-bold text-[10px] rounded-lg transition cursor-pointer"
                            >
                              التفسير وتدبري
                            </button>
                          </div>
                        </div>

                        {/* Verse Uthmani Text */}
                        <p 
                          className="font-quran text-right select-all font-semibold leading-relaxed mb-1"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {ayah.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* C. MEMORIZE ACTIVE RECALL MODE (Click to reveal hidden words) */}
              {readerMode === "memorize" && (
                <div className="space-y-4">
                  {/* Global Reveal All toggle */}
                  <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl text-xs">
                    <span className="font-bold text-slate-500">وضع التكرار والحفظ النشط: انقر فوق الكلمات المبهمة لإظهارها</span>
                    <button
                      onClick={() => {
                        setRevealAllHifz(!revealAllHifz);
                        if (revealAllHifz) setRevealedWords({});
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                    >
                      {revealAllHifz ? "إخفاء كل الكلمات" : "كشف كامل الصفحة"}
                    </button>
                  </div>

                  <div 
                    className={`text-right ${getLineSpacingClass()} font-serif px-1 sm:px-3 text-justify leading-relaxed tracking-wide`}
                    style={{ fontSize: `${fontSize}px` }}
                    dir="rtl"
                  >
                    {verses.map((ayah) => {
                      const wordsArray = ayah.text.split(" ");
                      return (
                        <span 
                          key={`${ayah.surahId}-${ayah.number}`}
                          className="font-quran border-b border-dashed border-slate-200/50 inline-block px-1 ml-1"
                        >
                          {wordsArray.map((word: string, wIdx: number) => {
                            const wordKey = `${ayah.number}-${wIdx}`;
                            const isRevealed = revealAllHifz || revealedWords[wordKey];
                            return (
                              <span
                                key={wordKey}
                                onClick={() => handleToggleWordReveal(wordKey)}
                                className={`inline-block mx-0.5 px-0.5 rounded cursor-pointer transition-all duration-200 select-none ${
                                  isRevealed 
                                    ? "font-bold" 
                                    : "bg-slate-200 dark:bg-slate-800 text-transparent hover:bg-emerald-100 dark:hover:bg-emerald-950/40 select-none filter blur-[3px]"
                                }`}
                              >
                                {word}
                              </span>
                            );
                          })}
                          <span className="inline-block text-emerald-600 dark:text-emerald-400 font-mono text-[0.65em] mr-1 select-none font-bold">
                            ﴿{ayah.numberInSurah}﴾
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Previous / Next Navigation Banners */}
              {!focusMode && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-850 pt-6 mt-10 select-none">
                  {selectionType === "surah" ? (
                    <>
                      <button
                        onClick={handlePrevSurah}
                        disabled={selectedSurah <= 1}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-300 rounded-xl transition font-bold text-xs flex items-center gap-1.5 cursor-pointer border dark:border-slate-850"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span>السورة السابقة</span>
                      </button>

                      <span className="text-xs font-bold text-slate-400">
                        نهاية سورة {SURAH_LIST[selectedSurah - 1]?.name}
                      </span>

                      <button
                        onClick={handleNextSurah}
                        disabled={selectedSurah >= 114}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-300 rounded-xl transition font-bold text-xs flex items-center gap-1.5 cursor-pointer border dark:border-slate-850"
                      >
                        <span>السورة التالية</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (selectedPage > 1) {
                            handlePageChange(selectedPage - 1);
                          }
                        }}
                        disabled={selectedPage <= 1}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-300 rounded-xl transition font-bold text-xs flex items-center gap-1.5 cursor-pointer border dark:border-slate-850"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span>الصفحة السابقة</span>
                      </button>

                      <span className="text-xs font-bold text-slate-400">
                        صفحة {selectedPage} من ٦٠٤
                      </span>

                      <button
                        onClick={() => {
                          if (selectedPage < 604) {
                            handlePageChange(selectedPage + 1);
                          }
                        }}
                        disabled={selectedPage >= 604}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-300 rounded-xl transition font-bold text-xs flex items-center gap-1.5 cursor-pointer border dark:border-slate-850"
                      >
                        <span>الصفحة التالية</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Verified Quran Data Source Footer */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-850/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-400 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-600" />
                  <span>المصدر المعتمد: مجمع الملك فهد لطباعة المصحف الشريف (بالرواية العثمانية المعتمدة)</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span>النصوص والتفسير: <span className="text-emerald-600 dark:text-emerald-400">AlQuran.cloud</span></span>
                  <span>•</span>
                  <span>الصوت والترجمة: <span className="text-emerald-600 dark:text-emerald-400">EveryAyah.com & Quran.com</span></span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* 3. VERSE DETAILS PANEL (Side drawer on desktop, bottom sheet on mobile) */}
        {isDetailsOpen && activeVerse && (
          <div className="fixed inset-0 z-50 flex flex-col lg:flex-row justify-end" dir="rtl">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsDetailsOpen(false)} 
            />
            <div className="w-full h-[85vh] mt-auto lg:mt-0 lg:h-full lg:w-96 bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10 rounded-t-3xl lg:rounded-none relative transform transition-transform border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-slate-800 animate-fade-in lg:animate-slide-in-right">

            
            {/* Header: active verse label & close button */}
            <div className="p-3 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-200">
                  خيارات الآية الكريمة
                </h4>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                  {activeVerse.surahName || SURAH_LIST[(activeVerse.surahId || selectedSurah) - 1]?.name} • آية {activeVerse.numberInSurah}
                </span>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-md transition cursor-pointer text-slate-400"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Quick action triggers row */}
            <div className="p-2 border-b bg-emerald-500/5 grid grid-cols-4 gap-1 text-center select-none">
              <button
                onClick={() => onPlayAyah(activeVerse.surahId || selectedSurah, activeVerse.numberInSurah, activeVerse.text)}
                className="p-2 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg transition flex flex-col items-center gap-1 cursor-pointer"
                title="تشغيل الآية"
              >
                <Play className="h-4.5 w-4.5" />
                <span className="text-[8px] font-bold">تشغيل</span>
              </button>
              <button
                onClick={() => handlePlaceReadingBookmark(activeVerse)}
                className="p-2 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg transition flex flex-col items-center gap-1 cursor-pointer"
                title="تثبيت علامة فاصل القراءة"
              >
                <Bookmark className="h-4.5 w-4.5" />
                <span className="text-[8px] font-bold">فاصل</span>
              </button>
              <button
                onClick={handleToggleBookmark}
                className={`p-2 hover:bg-emerald-600 hover:text-white rounded-lg transition flex flex-col items-center gap-1 cursor-pointer ${isBookmarked ? "text-amber-500" : "text-slate-500"}`}
                title="إضافة إلى المفضلة"
              >
                <Heart className={`h-4.5 w-4.5 ${isBookmarked ? "fill-amber-500" : ""}`} />
                <span className="text-[8px] font-bold">المفضلة</span>
              </button>
              <button
                onClick={() => handleShareVerse(activeVerse)}
                className="p-2 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg transition flex flex-col items-center gap-1 cursor-pointer"
                title="مشاركة الآية"
              >
                <Share2 className="h-4.5 w-4.5" />
                <span className="text-[8px] font-bold">مشاركة</span>
              </button>
            </div>

            {/* Selector tabs for side panel */}
            <div className="flex border-b bg-slate-50/50 dark:bg-slate-850/20 text-xs font-bold select-none p-1 gap-0.5">
              <button
                onClick={() => setDetailTab("tafsir")}
                className={`flex-1 py-2 rounded-md text-center transition cursor-pointer ${detailTab === "tafsir" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500"}`}
              >
                التفسير
              </button>
              <button
                onClick={() => setDetailTab("words")}
                className={`flex-1 py-2 rounded-md text-center transition cursor-pointer ${detailTab === "words" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500"}`}
              >
                معاني الكلمات
              </button>
              <button
                onClick={() => setDetailTab("reflections")}
                className={`flex-1 py-2 rounded-md text-center transition cursor-pointer ${detailTab === "reflections" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500"}`}
              >
                تدبري
              </button>
              <button
                onClick={() => setDetailTab("memorization")}
                className={`flex-1 py-2 rounded-md text-center transition cursor-pointer ${detailTab === "memorization" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-slate-500"}`}
              >
                الحفظ
              </button>
            </div>

            {/* TAB CONTENTS VIEWPORTS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Tab A: Tafsir */}
              {detailTab === "tafsir" && (
                <div className="space-y-3">
                  {/* Source selector */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400">مصدر التفسير:</span>
                    <select
                      value={tafsirSource}
                      onChange={(e) => setTafsirSource(e.target.value as any)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border rounded-md text-[10px] font-black text-slate-600 dark:text-slate-300"
                    >
                      <option value="ar.muyassar">التفسير الميسر</option>
                      <option value="ar.jalalayn">تفسير الجلالين</option>
                    </select>
                  </div>

                  {/* Tafsir box */}
                  <div className="bg-emerald-500/5 dark:bg-slate-950/20 border p-3 rounded-xl">
                    {isLoadingTafsir ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader className="h-5 w-5 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-serif text-justify font-semibold">
                          {tafsirText}
                        </p>
                        <span className="block text-[8px] text-slate-400 font-bold text-left mt-3">
                          المصدر المعتمد: مجمع الملك فهد لطباعة المصحف الشريف
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab B: Word meanings */}
              {detailTab === "words" && (
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-400 border-b pb-1">ترجمة الكلمات معانيها فردياً:</h5>
                  
                  {isLoadingWords ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader className="h-5 w-5 animate-spin text-emerald-600" />
                    </div>
                  ) : words.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold text-center py-6">تفصيل كلمات الآية غير متاح مؤقتاً</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {words.map((w, idx) => {
                        if (w.char_type_name === "end") return null;
                        return (
                          <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border text-center">
                            <span className="block font-quran text-base font-bold text-emerald-700 dark:text-emerald-400">{w.text_uthmani}</span>
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">{w.translation?.text || "..."}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab C: My Reflections (Notes) */}
              {detailTab === "reflections" && (
                <div className="space-y-4">
                  
                  {/* Submitting form */}
                  <form onSubmit={handleSubmitReflection} className="space-y-3">
                    <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 text-[10px] p-2 rounded-lg font-bold">
                      هذه مساحة للتدبر الشخصي، وليست تفسيرًا شرعيًا للآية.
                    </div>
                    
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="عنوان التدبر"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                    
                    <textarea
                      value={noteLesson}
                      onChange={(e) => setNoteLesson(e.target.value)}
                      placeholder="ماذا تعلمت من الآية؟"
                      rows={2}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                    
                    <textarea
                      value={newReflection}
                      onChange={(e) => setNewReflection(e.target.value)}
                      placeholder="ما المعنى الذي أثّر فيك؟"
                      rows={2}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                      required
                    />

                    <textarea
                      value={noteActionStep}
                      onChange={(e) => setNoteActionStep(e.target.value)}
                      placeholder="كيف سأطبق ذلك؟ (خطوة عملية)"
                      rows={2}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                    />

                    <textarea
                      value={noteDua}
                      onChange={(e) => setNoteDua(e.target.value)}
                      placeholder="دعاء أو خاطرة"
                      rows={2}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                    
                    <input
                      type="text"
                      value={newReflectionTags}
                      onChange={(e) => setNewReflectionTags(e.target.value)}
                      placeholder="الوسوم (تفريق بفاصلة)"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-[10px] font-bold text-slate-800 dark:text-slate-200"
                    />

                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={isNotePinned} onChange={(e) => setIsNotePinned(e.target.checked)} className="rounded" />
                        تثبيت النوت
                      </label>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={isNotePrivate} onChange={(e) => setIsNotePrivate(e.target.checked)} className="rounded" />
                        خاصة بي فقط
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmittingReflection}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                      >
                        {isSubmittingReflection ? "جاري الحفظ..." : "حفظ التدبر"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDetailsOpen(false)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-bold text-xs rounded-lg transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>

                  {/* History List */}
                  <div className="space-y-2 border-t pt-3">
                    <h6 className="text-[10px] font-black text-slate-400">تأملاتك السابقة للآية الكريمة:</h6>
                    {reflections.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-semibold text-center py-4">لم تسجل خواطر سابقة لهذه الآية بعد</p>
                    ) : (
                      reflections.map((n) => (
                        <div key={n.id} className="bg-slate-50 dark:bg-slate-950/20 border p-2.5 rounded-lg text-xs space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{n.reflectionText}</p>
                          {n.tags && n.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {n.tags.map((t) => (
                                <span key={t} className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1 rounded">#{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* Tab D: Memorization */}
              {detailTab === "memorization" && (
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-400 border-b pb-1">أنشئ خطة تكرار وحفظ لهذه الآية:</h5>
                  
                  <form onSubmit={handleCreateMemorizationPlan} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">عنوان الخطة:</label>
                      <input
                        type="text"
                        value={memoPlanTitle}
                        onChange={(e) => setMemoPlanTitle(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">من آية:</label>
                        <input
                          type="number"
                          value={activeVerse.numberInSurah}
                          disabled
                          className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-xs font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">إلى آية:</label>
                        <input
                          type="number"
                          min={activeVerse.numberInSurah}
                          max={SURAH_VERSE_COUNTS[(activeVerse.surahId || selectedSurah) - 1]}
                          value={memoEndVerse}
                          onChange={(e) => setMemoEndVerse(Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">تاريخ إتمام الحفظ المستهدف:</label>
                      <input
                        type="date"
                        value={memoTargetDate}
                        onChange={(e) => setMemoTargetDate(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-850 border rounded-lg text-xs font-bold text-center"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingMemo}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      {isCreatingMemo ? "جاري الحفظ..." : "تفعيل خطة الحفظ والتمكين"}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
          </div>
        )}

      </div>

      {/* 4. MODAL DRAWER A: SURAH LIST (All 114 Surahs Directory) */}
      {isSurahDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex justify-end transition-opacity duration-300 font-sans" dir="rtl">
          <div className="w-80 max-w-full bg-white dark:bg-slate-900 h-full p-5 flex flex-col justify-between shadow-2xl relative animate-slide-left">
            <button
              onClick={() => setIsSurahDrawerOpen(false)}
              className="absolute left-4 top-4 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="border-b pb-3 mb-4 text-right">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-200">فهرس سور القرآن الكريم</h3>
              <p className="text-[10px] text-slate-400 font-bold">١١٤ سورة مع الترتيب والبيانات المعتمدة</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {SURAH_LIST.map((surah) => {
                const isSelected = selectedSurah === surah.id && selectionType === "surah";
                return (
                  <div
                    key={surah.id}
                    onClick={() => {
                      setSelectedSurah(surah.id);
                      setSelectedVerse(1);
                      setSelectionType("surah");
                      setIsSurahDrawerOpen(false);
                      onShowToast(`تم فتح سورة ${surah.name}`, "info");
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected 
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                        : "bg-slate-50 dark:bg-slate-950/30 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-6 w-6 rounded-lg text-xs font-black flex items-center justify-center ${isSelected ? "bg-white/20 text-white" : "bg-slate-200/55 text-slate-500"}`}>
                        {surah.id}
                      </span>
                      <div className="text-right">
                        <span className="block text-xs font-serif font-black">{surah.name}</span>
                        <span className={`block text-[8px] font-bold leading-none ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                          {surah.type} • {surah.verses} آية
                        </span>
                      </div>
                    </div>
                    <ArrowRight className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-300"}`} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL B: COMPREHENSIVE TEXT SEARCH SCREEN */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90%] animate-fade-in text-right">
            
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute left-4 top-4 p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="h-5 w-5 text-emerald-600" />
                البحث المطور في آيات القرآن الكريم
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ابحث عن أي سورة بالاسم، أو آية بالرقم، أو كلمة ببحث لفظي دقيق وسريع</p>
            </div>

            {/* Form query */}
            <form onSubmit={handleQuranSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اكتب كلمة أو آية للبحث (مثال: الرحمن، الجبال)..."
                className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-850 border rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {isSearching ? "جاري البحث..." : "بحث"}
              </button>
            </form>

            {/* Results Grid / List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2">
                  <Loader className="h-8 w-8 animate-spin text-emerald-600" />
                  <span className="text-xs text-slate-400 font-bold">جاري الفحص المتقاطع لكلمات المصحف الشريف...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-16 space-y-1 bg-slate-50 dark:bg-slate-950/20 rounded-2xl p-4">
                  <Smile className="h-8 w-8 text-slate-300 mx-auto" />
                  <span className="block text-xs font-bold text-slate-400">البحث فارغ</span>
                  <p className="text-[10px] text-slate-400">أدخل كلمة للبحث للبدء بفرز الآيات ومواقعها</p>
                </div>
              ) : (
                searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(result)}
                    className="p-3 bg-slate-50 dark:bg-slate-950/30 border hover:border-emerald-300 rounded-2xl cursor-pointer transition text-right"
                  >
                    <div className="flex justify-between items-center text-[10px] mb-1.5">
                      <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        سورة {result.surah.name} | آية {result.numberInSurah}
                      </span>
                      <span className="text-slate-400 font-bold">الصفحة {result.page}</span>
                    </div>
                    <p className="font-serif font-black font-quran text-black dark:text-slate-100 leading-loose text-sm sm:text-base">
                      {result.text}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
