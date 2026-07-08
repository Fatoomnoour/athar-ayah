import React, { useState, useEffect } from "react";
import {
  Bookmark,
  Star,
  Trash2,
  Check,
  MapPin,
  BookmarkCheck,
} from "lucide-react";

import { Bookmark as BookmarkType, QuranNote, User } from "../types";
import { VERIFIED_VERSES } from "../data/verses";
import { SURAH_LIST as SURAHS } from "../utils/quranUtils";
import { formatFirestoreDate } from "../utils/dateUtils";
import {
  getUserBookmarks,
  getUserNotes,
  createBookmark,
  deleteBookmark,
  updateNote,
} from "../services/firestoreService";

interface BookmarksTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
  onNavigateToReader: (surahId: number, verseNumber: number) => void;
}

type NavigableItem = {
  surahId?: number | string;
  surah?: number | string;
  surahNumber?: number | string;
  verseNumber?: number | string;
  ayahNumber?: number | string;
  verseNum?: number | string;
  verse?: number | string;
};

export default function BookmarksTab({
  currentUser,
  onRefreshStats,
  onNavigateToReader,
}: BookmarksTabProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [favoriteNotes, setFavoriteNotes] = useState<QuranNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [formSurahId, setFormSurahId] = useState(1);
  const [formVerseNumber, setFormVerseNumber] = useState<number | string>(1);
  const [formNote, setFormNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSurahMeta = SURAHS.find((s) => s.id === formSurahId);
  const maxVerse = selectedSurahMeta?.verses || 7;

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const currentValue = Number(formVerseNumber);

    if (
      formVerseNumber !== "" &&
      Number.isFinite(currentValue) &&
      currentValue > maxVerse
    ) {
      setFormVerseNumber(maxVerse);
    }
  }, [formSurahId, maxVerse]);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      if (!currentUser) {
        setBookmarks([]);
        setFavoriteNotes([]);
        return;
      }

      const userBookmarks = await getUserBookmarks(currentUser.id);
      setBookmarks(userBookmarks);

      const userNotes = await getUserNotes(currentUser.id);
      setFavoriteNotes(userNotes.filter((note) => note.isFavorite));
    } catch (err) {
      console.error("Error fetching bookmark data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeVerseInput = (value: number | string) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }

    if (parsed > maxVerse) {
      return maxVerse;
    }

    return Math.floor(parsed);
  };

  const navigateToItem = (item: NavigableItem) => {
    const rawSurahId =
      item.surahId ?? item.surah ?? item.surahNumber ?? 1;

    const rawVerseNumber =
      item.verseNumber ??
      item.ayahNumber ??
      item.verseNum ??
      item.verse ??
      1;

    const parsedSurahId = Number(rawSurahId);
    const parsedVerseNumber = Number(rawVerseNumber);

    const safeSurahId =
      Number.isFinite(parsedSurahId) &&
      parsedSurahId >= 1 &&
      parsedSurahId <= 114
        ? Math.floor(parsedSurahId)
        : 1;

    const safeVerseNumber =
      Number.isFinite(parsedVerseNumber) && parsedVerseNumber >= 1
        ? Math.floor(parsedVerseNumber)
        : 1;

    onNavigateToReader(safeSurahId, safeVerseNumber);
  };

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    setIsSubmitting(true);
    setErrorMsg("");

    const normalizedVerse = normalizeVerseInput(formVerseNumber);
    const surahName = selectedSurahMeta?.name || "الفاتحة";

    try {
      await createBookmark(currentUser.id, {
        userId: currentUser.id,
        surahId: formSurahId,
        surahName,
        verseNumber: normalizedVerse,
        note: formNote,
      });

      setIsAdding(false);
      setFormNote("");
      setFormVerseNumber(1);

      await fetchData();
      onRefreshStats();
    } catch (err) {
      console.error("Error creating bookmark:", err);
      setErrorMsg("خطأ في الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    if (!currentUser) return;

    if (!confirm("هل أنت متأكد من حذف هذه العلامة المرجعية؟")) return;

    try {
      await deleteBookmark(currentUser.id, id);
      await fetchData();
      onRefreshStats();
    } catch (err) {
      console.error("Error deleting bookmark:", err);
    }
  };

  const handleRemoveFavorite = async (noteId: string) => {
    if (!currentUser) return;

    if (!confirm("هل تريد إزالة هذه الخاطرة من المفضلة؟")) return;

    try {
      await updateNote(currentUser.id, noteId, { isFavorite: false });
      await fetchData();
      onRefreshStats();
    } catch (err) {
      console.error("Error removing favorite note:", err);
    }
  };

  const getAyahTextForNote = (note: QuranNote) => {
    const anyNote = note as QuranNote & {
      ayahText?: string;
      verse?: { text?: string };
      ayah?: { text?: string };
    };

    const verified = VERIFIED_VERSES.find(
      (v) => v.surahId === note.surahId && v.verseNumber === note.verseNumber
    );

    return (
      note.verseText ||
      anyNote.ayahText ||
      anyNote.verse?.text ||
      anyNote.ayah?.text ||
      verified?.text ||
      "نص الآية غير متوفر"
    );
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        جاري تحميل الفواصل والمفضلة...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-l from-teal-850 to-teal-950 dark:from-slate-900 dark:to-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="p-3 bg-teal-100 dark:bg-emerald-950/40 text-teal-700 dark:text-emerald-400 rounded-2xl">
            <BookmarkCheck className="h-6 w-6" />
          </div>

          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
              الفواصل والمحفوظات الإيمانية
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              مكان موحّد لجمع علاماتك المرجعية والخواطر والتدبرات المفضلة لديك للوصول السريع إليها.
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

      {isAdding && (
        <form
          onSubmit={handleAddBookmark}
          className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in"
        >
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
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                السورة الكريمة
              </label>
              <select
                value={formSurahId}
                onChange={(e) => {
                  setFormSurahId(Number(e.target.value));
                  setFormVerseNumber(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="bookmark-surah-select"
              >
                {SURAHS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name} ({s.verses} آية)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                رقم الآية (الأقصى {maxVerse})
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formVerseNumber}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === "" || /^[0-9]+$/.test(value)) {
                    setFormVerseNumber(value);
                  }
                }}
                onBlur={(e) => {
                  setFormVerseNumber(normalizeVerseInput(e.target.value));
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="bookmark-verse-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                ملاحظة توضيحية (اختياري)
              </label>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    onClick={() => navigateToItem(bookmark)}
                    className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl group hover:border-emerald-200 hover:bg-emerald-50/5 transition duration-150 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {bookmark.surahName} ({bookmark.verseNumber})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatFirestoreDate(bookmark.createdAt)}
                          </span>
                        </div>

                        {bookmark.note ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap font-medium">
                            {bookmark.note}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">
                            لا توجد ملاحظة توضيحية.
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBookmark(bookmark.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition opacity-0 group-hover:opacity-100"
                        title="حذف العلامة"
                        id={`delete-bookmark-${bookmark.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
            <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-100 dark:fill-amber-950" />
            <span>الخواطر المفضلة ({favoriteNotes.length})</span>
          </h3>

          {favoriteNotes.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm flex-1 flex flex-col items-center justify-center">
              <Star className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">
                لا توجد خواطر مفضلة بعد
              </p>
              <p className="text-slate-400 text-xs mt-1">
                اضغط على نجمة المفضلة في أي خاطرة بالصفحة الرئيسية لتظهر هنا.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {favoriteNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => navigateToItem(note)}
                  className="p-4 bg-amber-50/5 dark:bg-amber-950/5 border border-amber-100 dark:border-amber-900/30 rounded-xl flex flex-col justify-between group relative hover:shadow-sm transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full text-xs font-semibold">
                        {note.surahName} • آية {note.verseNumber}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(note.id);
                        }}
                        className="text-amber-500 hover:text-slate-400 transition"
                        title="إزالة من المفضلة"
                        id={`remove-fav-${note.id}`}
                      >
                        <Star className="h-4 w-4 fill-amber-500" />
                      </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-center mb-3 text-slate-800 dark:text-slate-200">
                      <p className="quran-font text-md font-bold leading-relaxed text-emerald-800 dark:text-emerald-400">
                        {getAyahTextForNote(note)}
                      </p>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      {note.reflectionText}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-3 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                    <div className="flex gap-1">
                      {(note.tags || []).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <span>{formatFirestoreDate(note.createdAt)}</span>
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