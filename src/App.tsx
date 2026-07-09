import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Star,
  Bookmark,
  Award,
  Sparkles,
  BookMarked,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import Header from "./components/Header";
import NotesTab from "./components/NotesTab";
import BookmarksTab from "./components/BookmarksTab";
import MemorizationTab from "./components/MemorizationTab";
import QuranReader from "./components/QuranReader";
import AudioPlayer from "./components/AudioPlayer";
import MemorizeSession from "./components/MemorizeSession";
import ActiveRecitationTab from "./components/ActiveRecitationTab";
import GroupsTab from "./components/groups/GroupsTab";
import ProgressPage from "./components/ProgressPage";
import SettingsPage from "./components/SettingsPage";
import AuthPage from "./components/AuthPage";
import Toast, { ToastType } from "./components/Toast";
import OfflineIndicator from "./components/OfflineIndicator";

import { subscribeToAuthChanges, logout } from "./services/authService";
import {
  getUserNotes,
  getUserBookmarks,
  getReadingProgress,
  getUserMemorizationPlans,
  updateMemorizationPlan,
} from "./services/firestoreService";

import { User, MemorizationPlan } from "./types";
import { SURAH_VERSE_COUNTS, SURAH_LIST } from "./utils/quranUtils";
import { useDarkMode } from "./hooks/useDarkMode";
import { initAnalytics, trackAppOpen } from "./lib/analytics";
import { useFCM } from "./hooks/useFCM";

type AppTab =
  | "reader"
  | "notes"
  | "progress"
  | "bookmarks"
  | "memorization"
  | "active-recitation"
  | "groups"
  | "settings";

export default function App() {
  useFCM();

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>("reader");
  const { setTheme, isDark: darkMode } = useDarkMode();
  const [focusMode, setFocusMode] = useState<boolean>(false);

  const [activeMemoPlan, setActiveMemoPlan] =
    useState<MemorizationPlan | null>(null);

  const [activeAudio, setActiveAudio] = useState<{
    surahId: number;
    verseNumber: number;
    text: string;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastType[]>([]);

  const [lastRead, setLastRead] = useState<{
    surahId: number;
    verseNum: number;
    surahName: string;
  } | null>(null);

  const [readerInitialPosition, setReaderInitialPosition] = useState<{
    surahId: number;
    verseNumber: number;
    ts?: number;
  } | null>(null);

  const [stats, setStats] = useState({
    notesCount: 0,
    favoritesCount: 0,
    bookmarksCount: 0,
    completedSurahsCount: 0,
    plansCount: 0,
  });

  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    initAnalytics().then(() => trackAppOpen());

    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email || "مستخدم",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || undefined,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handlePathAndHash = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;

      if (path === "/quran" || hash === "#/quran" || hash === "#quran") {
        setActiveTab("reader");
      }
    };

    handlePathAndHash();
    window.addEventListener("hashchange", handlePathAndHash, {
      passive: true,
    });

    return () => window.removeEventListener("hashchange", handlePathAndHash);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const saved = localStorage.getItem(`last_read_${currentUser.id}`);

    if (saved) {
      try {
        setLastRead(JSON.parse(saved));
      } catch (error) {
        console.error("Invalid saved last read position:", error);
      }
    }

    getReadingProgress(currentUser.id)
      .then((data) => {
        if (data && data.lastSurahId) {
          const pos = {
            surahId: data.lastSurahId,
            verseNum: data.lastVerseNumber || 1,
            surahName:
              data.lastSurahName ||
              SURAH_LIST[data.lastSurahId - 1]?.name ||
              "",
          };

          setLastRead(pos);
          localStorage.setItem(
            `last_read_${currentUser.id}`,
            JSON.stringify(pos)
          );
        }
      })
      .catch((err) => console.error("Error loading reading progress", err));
  }, [currentUser]);

  const handleShowToast = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    const newToast: ToastType = {
      id: Math.random().toString(36).substring(2),
      message,
      type,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = async () => {
    try {
      await logout();

      setCurrentUser(null);
      setActiveMemoPlan(null);
      setActiveAudio(null);

      handleShowToast(
        "تم تسجيل خروجك بنجاح. رافقتك السلامة والبركة!",
        "info"
      );

      setStats({
        notesCount: 0,
        favoritesCount: 0,
        bookmarksCount: 0,
        completedSurahsCount: 0,
        plansCount: 0,
      });
    } catch (err) {
      console.error(err);
      handleShowToast("فشل تسجيل الخروج.", "error");
    }
  };

  const fetchStats = async () => {
    if (!currentUser) return;

    setIsStatsLoading(true);

    try {
      const userId = currentUser.id;

      const [notes, bookmarks, progress, plans] = await Promise.all([
        getUserNotes(userId),
        getUserBookmarks(userId),
        getReadingProgress(userId),
        getUserMemorizationPlans(userId),
      ]);

      setStats({
        notesCount: notes.length,
        favoritesCount: notes.filter((n) => n.isFavorite).length,
        bookmarksCount: bookmarks.length,
        completedSurahsCount: progress?.completedSurahs?.length || 0,
        plansCount: plans.length,
      });

      if (progress && progress.lastSurahId) {
        const pos = {
          surahId: progress.lastSurahId,
          verseNum: progress.lastVerseNumber || 1,
          surahName:
            progress.lastSurahName ||
            SURAH_LIST[progress.lastSurahId - 1]?.name ||
            "",
        };

        setLastRead(pos);
        localStorage.setItem(`last_read_${userId}`, JSON.stringify(pos));
      }
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStats();
    }
  }, [currentUser]);

  const handleNavigateToReader = (
    surahId?: number | string,
    verseNumber?: number | string
  ) => {
    const parsedSurahId = Number(surahId);
    const parsedVerseNumber = Number(verseNumber);

    const safeSurahId =
      Number.isFinite(parsedSurahId) &&
      parsedSurahId >= 1 &&
      parsedSurahId <= 114
        ? Math.floor(parsedSurahId)
        : 1;

    const maxVerse = SURAH_VERSE_COUNTS[safeSurahId - 1] || 1;

    const safeVerseNumber =
      Number.isFinite(parsedVerseNumber) &&
      parsedVerseNumber >= 1 &&
      parsedVerseNumber <= maxVerse
        ? Math.floor(parsedVerseNumber)
        : 1;

    setReaderInitialPosition({
      surahId: safeSurahId,
      verseNumber: safeVerseNumber,
      ts: Date.now(),
    });

    setActiveTab("reader");
  };

  const handlePlayAyah = (
    surahId: number,
    verseNumber: number,
    text: string
  ) => {
    setActiveAudio({ surahId, verseNumber, text });
    handleShowToast("جاري ربط السيرفر الصوتي للآية الكريمة...", "info");
  };

  const handleAudioNext = () => {
    if (!activeAudio) return;

    const { surahId, verseNumber } = activeAudio;
    const maxVerses = SURAH_VERSE_COUNTS[surahId - 1];

    if (verseNumber < maxVerses) {
      setActiveAudio({
        surahId,
        verseNumber: verseNumber + 1,
        text: "",
      });
    } else if (surahId < 114) {
      setActiveAudio({
        surahId: surahId + 1,
        verseNumber: 1,
        text: "",
      });
    }
  };

  const handleAudioPrev = () => {
    if (!activeAudio) return;

    const { surahId, verseNumber } = activeAudio;

    if (verseNumber > 1) {
      setActiveAudio({
        surahId,
        verseNumber: verseNumber - 1,
        text: "",
      });
    } else if (surahId > 1) {
      const prevSurahMax = SURAH_VERSE_COUNTS[surahId - 2];

      setActiveAudio({
        surahId: surahId - 1,
        verseNumber: prevSurahMax,
        text: "",
      });
    }
  };

  const handleMemorizeSessionComplete = async (
    planId: string,
    rating: "hard" | "medium" | "easy" | "mastered",
    intervalDays: number,
    nextReviewDate: string
  ) => {
    if (!currentUser) return;

    try {
      await updateMemorizationPlan(currentUser.id, planId, {
        nextReviewDate,
        intervalDays,
        revisionHistory: [
          { date: new Date().toISOString().split("T")[0], rating },
          ...(activeMemoPlan?.revisionHistory || []),
        ],
      });

      setActiveMemoPlan(null);
      fetchStats();
      setActiveTab("progress");
    } catch (err) {
      console.error(err);
      handleShowToast("فشل تدوين تقدم المراجعة بالتاريخ", "error");
    }
  };

  const tabs = [
    {
      id: "reader",
      name: "المصحف",
      icon: BookOpen,
      desc: "قراءة مع تفاسير وخواطر",
    },
    {
      id: "notes",
      name: "خواطر التدبر",
      icon: BookMarked,
      desc: "تأملات وخواطر إيمانية",
    },
    {
      id: "progress",
      name: "لوحة الإنجاز",
      icon: LayoutDashboard,
      desc: "تتبع التقدم والتكرار",
    },
    {
      id: "bookmarks",
      name: "الفواصل والمفضلة",
      icon: Bookmark,
      desc: "مواقع القراءة والخواطر المفضلة",
    },
    {
      id: "memorization",
      name: "خطط الحفظ",
      icon: Award,
      desc: "تخطيط تكرار الآيات",
    },
    {
      id: "active-recitation",
      name: "التسميع النشط",
      icon: Sparkles,
      desc: "اختبار الحفظ",
    },
    {
      id: "groups",
      name: "حلقات التدبر",
      icon: Users,
      desc: "مجتمعات للتدبر المشترك",
    },
    {
      id: "settings",
      name: "الإعدادات",
      icon: Settings,
      desc: "تخصيص الورد الشخصي",
    },
  ] as const;

  if (!currentUser) {
    return (
      <>
        <AuthPage />
        <Toast toasts={toasts} onClose={handleCloseToast} />
      </>
    );
  }

  const isReaderFocus = activeTab === "reader" && focusMode;

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300 ${
        isReaderFocus
          ? "pb-0"
          : activeAudio
          ? "pb-80 md:pb-56"
          : "pb-20 md:pb-0"
      }`}
    >
      <Toast toasts={toasts} onClose={handleCloseToast} />

      {!isReaderFocus && (
        <>
          <OfflineIndicator />
          <Header currentUser={currentUser} onLogout={handleLogout} />
        </>
      )}

      <main
        className={`w-full mx-auto flex-1 flex flex-col ${
          isReaderFocus
            ? "max-w-none px-1 sm:px-3 py-2 space-y-0"
            : "max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6"
        }`}
      >
        {!activeMemoPlan && !isReaderFocus && (
          <div className="bg-gradient-to-l from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-900/40 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="absolute right-[-10px] top-[-10px] font-serif text-7xl text-white/5 select-none font-bold">
              تدبر
            </div>

            <div className="text-right space-y-1 relative z-10">
              <h2 className="text-lg font-black flex items-center gap-2 text-emerald-300">
                <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
                أفلا يتدبرون القرآن؟
              </h2>

              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl font-serif">
                "كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِّيَدَّبَّرُوا
                آيَاتِهِ وَلِيَتَذَكَّرَ أُولُو الْأَلْبَابِ" - سورة ص،
                الآية ٢٩. هذا التطبيق معينك لتسجيل أثر كتاب الله في قلبك
                وتتبع حفظك وصقل وردك اليومي.
              </p>
            </div>

            <div className="text-xs text-slate-200 bg-slate-800/40 border border-slate-700/50 px-3.5 py-2 rounded-xl flex items-center gap-2 flex-shrink-0 self-end md:self-center">
              <span>
                التوقيت الحالي:{" "}
                {new Date().toLocaleTimeString("ar-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        )}

        {!activeMemoPlan && !isReaderFocus && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right w-full md:w-auto">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl flex-shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  متابعة تلاوتك ووردك اليومي
                </h3>

                {lastRead ? (
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    آخر موضع وصلت إليه:{" "}
                    <span className="text-emerald-600">
                      سورة {lastRead.surahName} آية {lastRead.verseNum}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    ابدأ قراءتك اليوم لتسجيل وتتبع فواصلك وخواطرك المباركة
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => handleNavigateToReader(1, 1)}
                className="flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                افتح المصحف
              </button>

              <button
                onClick={() =>
                  lastRead
                    ? handleNavigateToReader(lastRead.surahId, lastRead.verseNum)
                    : handleNavigateToReader(1, 1)
                }
                className="flex-1 md:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition cursor-pointer text-center"
              >
                تابع القراءة
              </button>
            </div>
          </div>
        )}

        {!activeMemoPlan && !isReaderFocus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab("notes")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "notes"
                  ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs"
                  : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">
                  إجمالي خواطرك
                </span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading ? "..." : stats.notesCount}
                </span>
              </div>

              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <BookMarked className="h-5 w-5" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab("progress")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "progress"
                  ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs"
                  : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">
                  السور المكتملة
                </span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading ? "..." : stats.completedSurahsCount}{" "}
                  <span className="text-xs text-slate-500">/ ١١٤</span>
                </span>
              </div>

              <div className="p-2 bg-teal-500/10 text-teal-600 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab("bookmarks")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "bookmarks"
                  ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs"
                  : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">
                  الفواصل والمفضلة
                </span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading
                    ? "..."
                    : stats.bookmarksCount + stats.favoritesCount}
                </span>
              </div>

              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Star className="h-5 w-5" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab("memorization")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "memorization"
                  ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs"
                  : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">
                  خطط الحفظ النشطة
                </span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading ? "..." : stats.plansCount}
                </span>
              </div>

              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

        {!activeMemoPlan && !isReaderFocus && (
          <div className="hidden md:flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition font-bold text-sm cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900"
                  }`}
                  id={`tab-btn-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="block">{tab.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative">
          {activeMemoPlan ? (
            <MemorizeSession
              planId={activeMemoPlan.id}
              planTitle={activeMemoPlan.title}
              surahId={activeMemoPlan.surahId}
              surahName={activeMemoPlan.surahName}
              startVerse={activeMemoPlan.startVerse}
              endVerse={activeMemoPlan.endVerse}
              onPlayAyah={handlePlayAyah}
              onShowToast={handleShowToast}
              onClose={() => setActiveMemoPlan(null)}
              onSessionComplete={handleMemorizeSessionComplete}
            />
          ) : (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl">
              <React.Suspense
                fallback={
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                }
              >
                {activeTab === "reader" && (
                  <QuranReader
                    key={readerInitialPosition?.ts || "reader"}
                    currentUser={currentUser}
                    onShowToast={handleShowToast}
                    onRefreshStats={fetchStats}
                    onPlayAyah={handlePlayAyah}
                    initialSurahId={readerInitialPosition?.surahId}
                    initialVerseNumber={readerInitialPosition?.verseNumber}
                    focusMode={focusMode}
                    setFocusMode={setFocusMode}
                  />
                )}

                {activeTab === "notes" && (
                  <NotesTab
                    currentUser={currentUser}
                    onRefreshStats={fetchStats}
                  />
                )}

                {activeTab === "progress" && (
                  <ProgressPage
                    currentUser={currentUser}
                    onStartMemorizeSession={(plan) =>
                      setActiveMemoPlan(plan)
                    }
                    onShowToast={handleShowToast}
                    onRefreshStats={fetchStats}
                    onNavigateToReader={handleNavigateToReader}
                    onNavigateToTab={(tab) => setActiveTab(tab as AppTab)}
                  />
                )}

                {activeTab === "bookmarks" && (
                  <BookmarksTab
                    currentUser={currentUser}
                    onRefreshStats={fetchStats}
                    onNavigateToReader={handleNavigateToReader}
                  />
                )}

                {activeTab === "memorization" && (
                  <MemorizationTab
                    currentUser={currentUser}
                    onRefreshStats={fetchStats}
                    onShowToast={handleShowToast}
                  />
                )}

                {activeTab === "active-recitation" && (
                  <ActiveRecitationTab
                    currentUser={currentUser}
                    onShowToast={handleShowToast}
                  />
                )}

                {activeTab === "groups" && (
                  <GroupsTab
                    currentUser={currentUser}
                    onShowToast={handleShowToast}
                  />
                )}

                {activeTab === "settings" && (
                  <SettingsPage
                    currentUser={currentUser}
                    onUpdateUser={(u) => setCurrentUser(u)}
                    onShowToast={handleShowToast}
                    onRefreshStats={fetchStats}
                  />
                )}
              </React.Suspense>
            </div>
          )}
        </div>
      </main>

      {!activeMemoPlan && !isReaderFocus && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] px-3 z-45 flex items-center justify-around shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400"
                }`}
                id={`mobile-tab-${tab.id}`}
              >
                <Icon className="h-5.5 w-5.5" />
                <span className="text-[9px] font-bold leading-none">
                  {tab.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <footer className="w-full max-w-7xl mx-auto px-4 py-8 mt-12 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
        <div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">
            أثر آية
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            منصة قرآنية متكاملة لتدبر وحفظ القرآن الكريم
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1">
          <span className="text-xs text-slate-500 font-bold">
            تطوير وتصميم:
          </span>
          <a
            href="https://www.linkedin.com/in/fatma-nour-ai-trainer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-black text-emerald-600 hover:text-emerald-500 transition"
          >
            Fatma Nour (AI Trainer)
          </a>
          <span className="text-[10px] text-slate-400 mt-1">
            للتواصل والاقتراحات
          </span>
        </div>
      </footer>

      {activeAudio && (
        <AudioPlayer
          surahId={activeAudio.surahId}
          verseNumber={activeAudio.verseNumber}
          verseText={activeAudio.text}
          onNextVerse={handleAudioNext}
          onPrevVerse={handleAudioPrev}
          onShowToast={handleShowToast}
          onClose={() => setActiveAudio(null)}
        />
      )}
    </div>
  );
}