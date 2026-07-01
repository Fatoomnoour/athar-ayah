import React, { useState, useEffect } from "react";
import { 
  Bookmark, Star, Trash2, Plus, Check, MapPin, 
  ChevronRight, Calendar, BookmarkCheck, FileText, Sparkles 
} from "lucide-react";
import { Bookmark as BookmarkType, QuranNote, User } from "../types";
import { SURAHS } from "../data/surahs";
import { VERIFIED_VERSES } from "../data/verses";

interface BookmarksTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
}

export default function BookmarksTab({ currentUser, onRefreshStats }: BookmarksTabProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [favoriteNotes, setFavoriteNotes] = useState<QuranNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Bookmark state
  const [isAdding, setIsAdding] = useState(false);
  const [formSurahId, setFormSurahId] = useState(1);
  const [formVerseNumber, setFormVerseNumber] = useState(1);
  const [formNote, setFormNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || "kidscodinghub1512@gmail.com";
      
      // Fetch Bookmarks
      const resB = await fetch(`/api/bookmarks?userId=${encodeURIComponent(userId)}`);
      if (resB.ok) {
        const dataB = await resB.json();
        setBookmarks(dataB);
      }

      // Fetch Favorite Notes
      const resF = await fetch(`/api/notes?userId=${encodeURIComponent(userId)}`);
      if (resF.ok) {
        const dataF: QuranNote[] = await resF.json();
        setFavoriteNotes(dataF.filter(note => note.isFavorite));
      }
    } catch (err) {
      console.error("Error fetching bookmark data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSurahMeta = SURAHS.find(s => s.id === formSurahId);

  useEffect(() => {
    if (selectedSurahMeta && formVerseNumber > selectedSurahMeta.versesCount) {
      setFormVerseNumber(1);
    }
  }, [formSurahId]);

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const userId = currentUser?.id || "kidscodinghub1512@gmail.com";
    const surahName = selectedSurahMeta?.name || "الفاتحة";

    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          surahId: formSurahId,
          surahName,
          verseNumber: formVerseNumber,
          note: formNote
        })
      });

      if (res.ok) {
        setIsAdding(false);
        setFormNote("");
        fetchData();
        onRefreshStats();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "حدث خطأ أثناء حفظ الفاصل.");
      }
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        onRefreshStats();
      }
    } catch (err) {
      console.error("Error deleting bookmark:", err);
    }
  };

  const handleRemoveFavorite = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/favorite`, { method: "POST" });
      if (res.ok) {
        fetchData();
        onRefreshStats();
      }
    } catch (err) {
      console.error("Error removing favorite note:", err);
    }
  };

  // Get matching scripture if available, or generate a beautiful label
  const getScriptureText = (surahId: number, verseNo: number, surahName: string) => {
    const matched = VERIFIED_VERSES.find(v => v.surahId === surahId && v.verseNumber === verseNo);
    return matched ? matched.text : `الآية رقم ${verseNo} من سورة ${surahName}`;
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-l from-teal-850 to-teal-950 dark:from-slate-900 dark:to-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="p-3 bg-teal-100 dark:bg-emerald-950/40 text-teal-700 dark:text-emerald-400 rounded-2xl">
            <BookmarkCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">الفواصل والمحفوظات الإيمانية</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              مكان موحّد لجمع علاماتك المرجعية (الفواصل) والخواطر والتدبرات المفضلة لديك للوصول السريع إليها.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 shadow-xs ${
            isAdding 
              ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-50 dark:shadow-none"
          }`}
          id="add-bookmark-btn"
        >
          {isAdding ? "إلغاء الإضافة" : "إضافة فاصل مرجعي جديد"}
        </button>
      </div>

      {/* Inline Adding form */}
      {isAdding && (
        <form onSubmit={handleAddBookmark} className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <MapPin className="h-4.5 w-4.5 text-emerald-600" />
            <span>تسجيل علامة مرجعية جديدة</span>
          </h4>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">السورة الكريمة</label>
              <select
                value={formSurahId}
                onChange={(e) => setFormSurahId(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="bookmark-surah-select"
              >
                {SURAHS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name} ({s.versesCount} آية)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                رقم الآية (الأقصى {selectedSurahMeta?.versesCount || 286})
              </label>
              <input
                type="number"
                min={1}
                max={selectedSurahMeta?.versesCount || 286}
                value={formVerseNumber}
                onChange={(e) => setFormVerseNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="bookmark-verse-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ملاحظة توضيحية (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: ورد الفجر، سجدة التلاوة..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="bookmark-note-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
              id="bookmark-submit-btn"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>حفظ العلامة</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Bookmarks (Left 40%) vs Favorite Notes (Right 60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signpost bookmarks list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              <Bookmark className="h-4.5 w-4.5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
              <span>علاماتي المرجعية (الفواصل) ({bookmarks.length})</span>
            </h3>

            {bookmarks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Bookmark className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p>لم تحفظ أي علامات مرجعية حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {bookmarks.map((b) => (
                  <div 
                    key={b.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between group hover:border-emerald-200 hover:bg-emerald-50/5 transition duration-150"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {b.surahName} ({b.verseNumber})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                      {b.note ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap font-medium">
                          {b.note}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">
                          لا توجد ملاحظة توضيحية.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteBookmark(b.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                      title="حذف العلامة"
                      id={`delete-bookmark-${b.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Favorite notes list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
            <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-100 dark:fill-amber-950" />
            <span>الخواطر المفضلة ({favoriteNotes.length})</span>
          </h3>

          {favoriteNotes.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm flex-1 flex flex-col items-center justify-center">
              <Star className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">لا توجد خواطر مفضلة بعد</p>
              <p className="text-slate-400 text-xs mt-1">اضغط على نجمة المفضلة في أي خاطرة بالصفحة الرئيسية لتظهر هنا.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {favoriteNotes.map((note) => (
                <div 
                  key={note.id}
                  className="p-4 bg-amber-50/5 dark:bg-amber-950/5 border border-amber-100 dark:border-amber-900/30 rounded-xl flex flex-col justify-between group relative hover:shadow-sm transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full text-xs font-semibold">
                        {note.surahName} • آية {note.verseNumber}
                      </span>
                      <button
                        onClick={() => handleRemoveFavorite(note.id)}
                        className="text-amber-500 hover:text-slate-400 transition"
                        title="إزالة من المفضلة"
                        id={`remove-fav-${note.id}`}
                      >
                        <Star className="h-4 w-4 fill-amber-500" />
                      </button>
                    </div>

                    {/* Classic Scripture */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-center mb-3 text-slate-800 dark:text-slate-200">
                      <p className="quran-font text-md font-bold leading-relaxed text-emerald-800 dark:text-emerald-400">
                        {note.verseText}
                      </p>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      {note.reflectionText}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-3 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                    <div className="flex gap-1">
                      {note.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span>
                      {new Date(note.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
