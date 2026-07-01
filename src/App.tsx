import React, { useState, useEffect } from "react";
import { 
  BookOpen, Star, Bookmark, Award, Sparkles, BookMarked, 
  ChevronLeft, LayoutDashboard, Calendar, RefreshCw, Settings, Users 
} from "lucide-react";
import Header from "./components/Header";
import NotesTab from "./components/NotesTab";
import ProgressTab from "./components/ProgressTab";
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
import { User, MemorizationPlan } from "./types";
import { SURAH_VERSE_COUNTS } from "./utils/quranUtils";
import { Theme, useDarkMode } from "./hooks/useDarkMode";

export default function App() {
  // Session Persistence
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<"reader" | "notes" | "progress" | "bookmarks" | "memorization" | "active-recitation" | "settings">("reader");
  const { theme, setTheme, isDark: darkMode } = useDarkMode();
  const [focusMode, setFocusMode] = useState<boolean>(false);
  
  // Advanced Hifz / Memorization Session overlay state
  const [activeMemoPlan, setActiveMemoPlan] = useState<MemorizationPlan | null>(null);

  // Sticky Audio Player active verse state
  const [activeAudio, setActiveAudio] = useState<{
    surahId: number;
    verseNumber: number;
    text: string;
  } | null>(null);

  // Toast array manager
  const [toasts, setToasts] = useState<ToastType[]>([]);

  // Last read position & reader jumper props
  const [lastRead, setLastRead] = useState<{ surahId: number; verseNum: number; surahName: string } | null>(null);
  const [readerInitialPosition, setReaderInitialPosition] = useState<{ surahId: number; verseNumber: number } | null>(null);

  // Sync hash/route path for /quran or #/quran
  useEffect(() => {
    const handlePathAndHash = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === "/quran" || hash === "#/quran" || hash === "#quran") {
        setActiveTab("reader");
      }
    };
    handlePathAndHash();
    window.addEventListener("hashchange", handlePathAndHash, { passive: true });
    return () => window.removeEventListener("hashchange", handlePathAndHash);
  }, []);

  // Fetch or sync last read position
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`last_read_${currentUser.id}`);
      if (saved) {
        try {
          setLastRead(JSON.parse(saved));
        } catch (e) {}
      }
      
      fetch(`/api/progress?userId=${encodeURIComponent(currentUser.id)}`)
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(data => {
          if (data && data.lastSurahId) {
            const pos = {
              surahId: data.lastSurahId,
              verseNum: data.lastVerseNumber || 1,
              surahName: data.lastSurahName || ""
            };
            setLastRead(pos);
            localStorage.setItem(`last_read_${currentUser.id}`, JSON.stringify(pos));
          }
        })
        .catch(err => console.error("Error loading reading progress", err));
    }
  }, [currentUser]);

  // Quick stats counts
  const [stats, setStats] = useState({
    notesCount: 0,
    favoritesCount: 0,
    bookmarksCount: 0,
    completedSurahsCount: 0,
    plansCount: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Load dark mode preferences on mount
  useEffect(() => {
    // The useDarkMode hook already handles initial theme setup and logic.
    // This effect is kept for backward compatibility if needed, but the actual state
    // is now managed by the useDarkMode hook which is initialized earlier.
  }, []);

  const handleShowToast = (message: string, type: "success" | "error" | "info") => {
    const newToast: ToastType = {
      id: Math.random().toString(36).substring(2),
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Real Email / Password and Google Login callbacks
  const handleLogin = async (email: string, name: string) => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        handleShowToast(`أهلاً بك مجدداً يا ${data.user.displayName || name || "باغي الخير"}! ✨`, "success");
      }
    } catch (err) {
      console.error("Auth login failed", err);
      // Fallback offline session
      const fallbackUser = { id: email.toLowerCase(), name, email: email.toLowerCase() };
      setCurrentUser(fallbackUser);
      localStorage.setItem("user", JSON.stringify(fallbackUser));
      handleShowToast("تم تفعيل جلسة تصفح محلية", "info");
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("user", JSON.stringify(user));
    handleShowToast(`مرحباً بك مجدداً، ${user.displayName || user.name}! ✨`, "success");
  };

  const handleGoogleLoginSimulate = async (email: string, name: string) => {
    await handleLogin(email, name);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("user");
    setActiveMemoPlan(null);
    setActiveAudio(null);
    handleShowToast("تم تسجيل خروجك بنجاح. رافقتك السلامة والبركة!", "info");
    setStats({
      notesCount: 0,
      favoritesCount: 0,
      bookmarksCount: 0,
      completedSurahsCount: 0,
      plansCount: 0
    });
  };

  // Fetch quick stats for the user dashboard
  const fetchStats = async () => {
    if (!currentUser) return;
    setIsStatsLoading(true);
    try {
      const userId = currentUser.id;
      const [resNotes, resBookmarks, resProgress, resPlans] = await Promise.all([
        fetch(`/api/notes?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/bookmarks?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/progress?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/memorization?userId=${encodeURIComponent(userId)}`)
      ]);

      let notesCount = 0;
      let favoritesCount = 0;
      let bookmarksCount = 0;
      let completedSurahsCount = 0;
      let plansCount = 0;

      if (resNotes.ok) {
        const notes = await resNotes.json();
        notesCount = notes.length;
        favoritesCount = notes.filter((n: any) => n.isFavorite).length;
      }
      if (resBookmarks.ok) {
        const bookmarks = await resBookmarks.json();
        bookmarksCount = bookmarks.length;
      }
      if (resProgress.ok) {
        const progress = await resProgress.json();
        completedSurahsCount = progress.completedSurahs?.length || 0;
      }
      if (resPlans.ok) {
        const plans = await resPlans.json();
        plansCount = plans.length;
      }

      setStats({
        notesCount,
        favoritesCount,
        bookmarksCount,
        completedSurahsCount,
        plansCount
      });
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

  // Launch audio playback from other widgets
  const handlePlayAyah = (surahId: number, verseNumber: number, text: string) => {
    setActiveAudio({ surahId, verseNumber, text });
    handleShowToast("جاري ربط السيرفر الصوتي للآية الكريمة...", "info");
  };

  // Synchronized Next/Prev Audio controls
  const handleAudioNext = () => {
    if (!activeAudio) return;
    const { surahId, verseNumber } = activeAudio;
    const maxVerses = SURAH_VERSE_COUNTS[surahId - 1];
    if (verseNumber < maxVerses) {
      setActiveAudio({ surahId, verseNumber: verseNumber + 1, text: "" });
    } else if (surahId < 114) {
      setActiveAudio({ surahId: surahId + 1, verseNumber: 1, text: "" });
    }
  };

  const handleAudioPrev = () => {
    if (!activeAudio) return;
    const { surahId, verseNumber } = activeAudio;
    if (verseNumber > 1) {
      setActiveAudio({ surahId, verseNumber: verseNumber - 1, text: "" });
    } else if (surahId > 1) {
      const prevSurahMax = SURAH_VERSE_COUNTS[surahId - 2];
      setActiveAudio({ surahId: surahId - 1, verseNumber: prevSurahMax, text: "" });
    }
  };

  // Memorize session completed save handler
  const handleMemorizeSessionComplete = async (
    planId: string, 
    rating: "hard" | "medium" | "easy" | "mastered", 
    intervalDays: number, 
    nextReviewDate: string
  ) => {
    try {
      const res = await fetch(`/api/memorization/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextReviewDate,
          intervalDays,
          revisionHistory: [
            { date: new Date().toISOString().split('T')[0], rating },
            ...(activeMemoPlan?.revisionHistory || [])
          ]
        })
      });

      if (res.ok) {
        setActiveMemoPlan(null);
        fetchStats();
        setActiveTab("progress");
      }
    } catch (err) {
      console.error(err);
      handleShowToast("فشل تدوين تقدم المراجعة بالتاريخ", "error");
    }
  };

  // Navigation tab items configuration
  const tabs = [
    { id: "reader", name: "المصحف", icon: BookOpen, desc: "قراءة مع تفاسير وخواطر" },
    { id: "notes", name: "خواطر التدبر", icon: BookMarked, desc: "تأملات وخواطر إيمانية" },
    { id: "progress", name: "لوحة الإنجاز", icon: LayoutDashboard, desc: "تتبع التقدم والتكرار" },
    { id: "bookmarks", name: "الفواصل والمفضلة", icon: Bookmark, desc: "مواقع القراءة والخواطر المفضلة" },
    { id: "memorization", name: "خطط الحفظ", icon: Award, desc: "تخطيط تكرار الآيات" },
    { id: "active-recitation", name: "التسميع النشط", icon: Sparkles, desc: "اختبار الحفظ" },
    { id: "groups", name: "حلقات التدبر", icon: Users, desc: "مجتمعات للتدبر المشترك" },
    { id: "settings", name: "الإعدادات", icon: Settings, desc: "تخصيص الورد الشخصي" }
  ] as const;

  // Render the unauthenticated AuthPage route if currentUser is not set
  if (!currentUser) {
    return (
      <>
        <AuthPage 
          onAuthSuccess={handleAuthSuccess}
          onGoogleLoginSimulate={handleGoogleLoginSimulate}
        />
        <Toast toasts={toasts} onClose={handleCloseToast} />
      </>
    );
  }

  const isReaderFocus = activeTab === "reader" && focusMode;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300 ${isReaderFocus ? "pb-0" : activeAudio ? "pb-80 md:pb-56" : "pb-20 md:pb-0"}`}>
      
      {/* Toast Feed */}
      <Toast toasts={toasts} onClose={handleCloseToast} />

      {/* Top Header */}
      {!isReaderFocus && (
        <Header 
          currentUser={currentUser} 
          onLogin={handleLogin} 
          onLogout={handleLogout}
        />
      )}

      <main className={`w-full mx-auto flex-1 flex flex-col ${isReaderFocus ? "max-w-none px-1 sm:px-3 py-2 space-y-0" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6"}`}>
        
        {/* Ambient Quran Quote */}
        {!activeMemoPlan && !isReaderFocus && (
          <div className="bg-gradient-to-l from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-900/40 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="absolute right-[-10px] top-[-10px] font-serif text-7xl text-white/5 select-none font-bold">تدبر</div>
            <div className="text-right space-y-1 relative z-10">
              <h2 className="text-lg font-black flex items-center gap-2 text-emerald-300">
                <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
                أفلا يتدبرون القرآن؟
              </h2>
              <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl font-serif">
                "كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِّيَدَّبَّرُوا آيَاتِهِ وَلِيَتَذَكَّرَ أُولُو الْأَلْبَابِ" - سورة ص، الآية ٢٩. هذا التطبيق معينك لتسجيل أثر كتاب الله في قلبك وتتبع حفظك وصقل وردك اليومي.
              </p>
            </div>
            
            <div className="text-xs text-slate-200 bg-slate-800/40 border border-slate-700/50 px-3.5 py-2 rounded-xl flex items-center gap-2 flex-shrink-0 self-end md:self-center">
              <span>التوقيت الحالي: {new Date().toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )}

        {/* Continue Reading / Open Quran Dashboard Widget */}
        {!activeMemoPlan && !isReaderFocus && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right w-full md:w-auto">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl flex-shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">متابعة تلاوتك ووردك اليومي</h3>
                {lastRead ? (
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    آخر موضع وصلت إليه: <span className="text-emerald-600">سورة {lastRead.surahName} (آية {lastRead.verseNum})</span>
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
                onClick={() => {
                  setReaderInitialPosition({ surahId: 1, verseNumber: 1 });
                  setActiveTab("reader");
                }}
                className="flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer text-center"
              >
                افتح المصحف
              </button>

              <button
                onClick={() => {
                  if (lastRead) {
                    setReaderInitialPosition({ surahId: lastRead.surahId, verseNumber: lastRead.verseNum });
                  } else {
                    setReaderInitialPosition({ surahId: 1, verseNumber: 1 });
                  }
                  setActiveTab("reader");
                }}
                className="flex-1 md:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition cursor-pointer text-center"
              >
                تابع القراءة
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Quick stats summary */}
        {!activeMemoPlan && !isReaderFocus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Notes */}
            <div 
              onClick={() => setActiveTab("notes")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "notes" ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs" : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">إجمالي خواطرك</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading ? "..." : stats.notesCount}
                </span>
              </div>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <BookMarked className="h-5 w-5" />
              </div>
            </div>

            {/* Reading position progress */}
            <div 
              onClick={() => setActiveTab("progress")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "progress" ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs" : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">السور المكتملة</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading ? "..." : stats.completedSurahsCount} <span className="text-xs text-slate-500">/ ١١٤</span>
                </span>
              </div>
              <div className="p-2 bg-teal-500/10 text-teal-600 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            {/* Bookmarks */}
            <div 
              onClick={() => setActiveTab("bookmarks")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "bookmarks" ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs" : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">الفواصل والمفضلة</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {isStatsLoading ? "..." : stats.bookmarksCount + stats.favoritesCount}
                </span>
              </div>
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                <Star className="h-5 w-5" />
              </div>
            </div>

            {/* Hifz Plans */}
            <div 
              onClick={() => setActiveTab("memorization")}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "memorization" ? "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-850 shadow-xs" : "bg-white dark:bg-slate-900 hover:border-slate-200"
              }`}
            >
              <div>
                <span className="text-slate-400 text-xs block">خطط الحفظ النشطة</span>
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

        {/* Desktop Header Nav Navigation rail */}
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

        {/* Viewport Core Rendering */}
        <div className="relative">
          {activeMemoPlan ? (
            /* Immersive Spaced Memorization session overlay */
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
            /* Standard tab viewports */
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl">
              {activeTab === "reader" && (
                <QuranReader 
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
                  onStartMemorizeSession={(plan) => setActiveMemoPlan(plan)}
                  onShowToast={handleShowToast}
                  onRefreshStats={fetchStats}
                />
              )}
              {activeTab === "bookmarks" && (
                <BookmarksTab 
                  currentUser={currentUser} 
                  onRefreshStats={fetchStats} 
                />
              )}
              {activeTab === "memorization" && (
                <MemorizationTab 
                  currentUser={currentUser} 
                  onRefreshStats={fetchStats} 
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
            </div>
          )}
        </div>

      </main>

      {/* Mobile devices sticky footer tabs bar */}
      {!activeMemoPlan && !isReaderFocus && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 py-2.5 px-3 z-45 flex items-center justify-around shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                id={`mobile-tab-${tab.id}`}
              >
                <Icon className="h-5.5 w-5.5" />
                <span className="text-[9px] font-bold leading-none">{tab.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Fixed advanced sticky Audio Player */}
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
