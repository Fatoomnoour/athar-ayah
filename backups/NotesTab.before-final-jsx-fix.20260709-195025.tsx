import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Pin, Star, Trash2, Edit2, Check, Tag, Bookmark, 
  HelpCircle, ChevronRight, Filter, AlertCircle 
} from "lucide-react";
import { QuranNote, User } from "../types";
import { VERIFIED_VERSES } from "../data/verses";
import { SURAH_LIST as SURAHS } from "../utils/quranUtils";
import { formatFirestoreDate } from "../utils/dateUtils";
import { getUserNotes, deleteNote, updateNote, createNote } from "../services/firestoreService";

interface NotesTabProps {
  currentUser: User | null;
  onRefreshStats: () => void;
}

export default function NotesTab({ currentUser, onRefreshStats }: NotesTabProps) {
  const [notes, setNotes] = useState<QuranNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSurahFilter, setSelectedSurahFilter] = useState<string>("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("");
  
  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<QuranNote | null>(null);
  
  // Form fields
  const [formSurahId, setFormSurahId] = useState(2); // Default to Al-Baqarah
  const [formVerseNumber, setFormVerseNumber] = useState<number | string>(152);
  const [formReflection, setFormReflection] = useState("");
  const [formTagsString, setFormTagsString] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [formFavorite, setFormFavorite] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedVerseTexts, setFetchedVerseTexts] = useState<Map<string, string>>(new Map());

  // Suggested tags
  const popularTags = ["طمأنينة", "صبر", "دعاء", "رحمة", "توكل", "عمل", "تفاؤل", "أمل", "توجيه"];

  useEffect(() => {
    fetchNotes();
  }, [currentUser, search, selectedSurahFilter, selectedTagFilter]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      if (!currentUser) return;
      const data = await getUserNotes(currentUser.id, selectedSurahFilter ? Number(selectedSurahFilter) : undefined);

      // Identify notes with missing verseText and collect unique surahIds
      const notesWithMissingText = data.filter(n => !n.verseText && n.surahId && n.verseNumber);
      const uniqueSurahIdsToFetch = new Set<number>();
      notesWithMissingText.forEach(n => uniqueSurahIdsToFetch.add(n.surahId));

      // Fetch missing surah data from API
      const newFetchedVerseTexts = new Map<string, string>();
      const fetchPromises = Array.from(uniqueSurahIdsToFetch).map(async (sId) => {
        try {
          const url = `https://api.alquran.cloud/v1/surah/${sId}/quran-uthmani`;
          const res = await fetch(url);
          if (res.ok) {
            const result = await res.json();
            result.data.ayahs.forEach((ayah: any) => {
              newFetchedVerseTexts.set(`${sId}:${ayah.numberInSurah}`, ayah.text);
            });
          } else {
            console.error(`Failed to fetch surah ${sId} from API`);
          }
        } catch (err) {
          console.error(`Error fetching surah ${sId}:`, err);
        }
      });
      await Promise.all(fetchPromises);
      setFetchedVerseTexts(newFetchedVerseTexts);

      
      // Filter locally for now
      let filtered = data;
      if (search) {
        filtered = filtered.filter(n => 
          n.reflectionText.includes(search) || 
          n.verseText.includes(search) ||
          n.title?.includes(search) ||
          n.surahName.includes(search) ||
          n.lesson?.includes(search) ||
          n.verseNumber.toString() === search
        );
      }
      if (selectedTagFilter) {
        filtered = filtered.filter(n => n.tags.includes(selectedTagFilter));
      }
      setNotes(filtered);
    } catch (err) {
      console.error("Error fetching notes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSurahMeta = SURAHS.find(s => s.id === formSurahId);

  // When Surah changes in form, reset verse number if it exceeds maximum
  useEffect(() => {
    if (selectedSurahMeta) { 
      if (Number(formVerseNumber) > selectedSurahMeta.verses) {
        setFormVerseNumber(1);
      }
    }
  }, [formSurahId]);

  // Autofill verse text if it matches a verified verse
  const getAutofilledVerseText = () => {
    const verseNum = Number(formVerseNumber);
    const verified = VERIFIED_VERSES.find(v => v.surahId === formSurahId && v.verseNumber === verseNum);
    return verified ? verified.text : "";
  };

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setFormSurahId(2);
    setFormVerseNumber(152);
    setFormReflection("");
    setFormTagsString("");
    setFormPinned(false);
    setFormFavorite(false);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: QuranNote) => {
    setEditingNote(note);
    setFormSurahId(note.surahId);
    setFormVerseNumber(note.verseNumber);
    setFormReflection(note.reflectionText);
    setFormTagsString(note.tags.join(" "));
    setFormPinned(note.pinned);
    setFormFavorite(note.isFavorite);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReflection.trim()) {
      setErrorMsg("يرجى كتابة تفكرك أو تدبرك حول الآية الكريمة.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const tags = formTagsString
      .split(/[\s，,、]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const surahName = selectedSurahMeta?.name || "البقرة";

    const payload = {
      userId: currentUser?.id || "kidscodinghub1512@gmail.com",
      verseText: getAutofilledVerseText(),
      surahId: formSurahId,
      surahName,
      verseNumber: Number(formVerseNumber),
      reflectionText: formReflection,
      tags,
      pinned: formPinned,
      isFavorite: formFavorite
    };

    try {
      if (editingNote) {
        await updateNote(currentUser.id, editingNote.id, payload);
      } else {
        await createNote(currentUser.id, payload);
      }

      setIsModalOpen(false);
      fetchNotes();
      onRefreshStats();
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه الخاطرة التفكرية؟")) return;
    try {
      await deleteNote(currentUser.id, id);
      fetchNotes();
      onRefreshStats();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const handleTogglePin = async (note: QuranNote) => {
    if (!currentUser) return;
    try {
      await updateNote(currentUser.id, note.id, { pinned: !note.pinned });
      fetchNotes();
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  const handleToggleFavorite = async (note: QuranNote) => {
    if (!currentUser) return;
    try {
      await updateNote(currentUser.id, note.id, { isFavorite: !note.isFavorite });
      fetchNotes();
      onRefreshStats();
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleAutofillFromVerified = (v: typeof VERIFIED_VERSES[0]) => {
    setFormSurahId(v.surahId);
    setFormVerseNumber(v.verseNumber);
    // Auto-suggest tags based on topic
    setFormTagsString(v.topic);
  };

  // Get unique tags from all notes
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  const getAyahTextForNote = (note: QuranNote) => {
    if (note.verseText) return note.verseText;
    const verified = VERIFIED_VERSES.find(v => v.surahId === note.surahId && v.verseNumber === note.verseNumber);
    if (verified) return verified.text;
    const cacheKey = `${note.surahId}:${note.verseNumber}`;
    if (fetchedVerseTexts.has(cacheKey)) return fetchedVerseTexts.get(cacheKey)!;
    return "نص الآية غير متوفر";
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث في الخواطر، الآيات، أو السور..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              id="search-input"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Filter by Surah */}
            <select
              value={selectedSurahFilter}
              onChange={(e) => setSelectedSurahFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm text-slate-700 dark:text-slate-300"
              id="filter-surah-select"
            >
              <option value="">كل السور</option>
              {SURAHS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.verses} آية)
                </option>
              ))}
            </select>

            {/* Filter by Tag */}
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-sm text-slate-700 dark:text-slate-300"
              id="filter-tag-select"
            >
              <option value="">كل التصنيفات</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>

            {/* Add Note Button */}
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 font-medium text-sm transition shadow-sm shadow-emerald-100 dark:shadow-none"
              id="add-note-btn"
            >
              <Plus className="h-4 w-4" />
              <span>خاطرة جديدة</span>
            </button>
          </div>
        </div>

        {/* Quick Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="h-3 w-3" /> تصفية سريعة:
            </span>
            <button
              onClick={() => setSelectedTagFilter("")}
              className={`px-2 py-1 rounded-md transition ${!selectedTagFilter ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
              id="clear-tag-filter"
            >
              الكل
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTagFilter(tag)}
                className={`px-2 py-1 rounded-md transition ${selectedTagFilter === tag ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}
                id={`tag-filter-${tag}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          <p className="text-slate-400 text-sm">جاري تحميل خواطر التدبر...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-800 max-w-lg mx-auto">
          <Bookmark className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد خواطر بعد</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            التدبر هو روح القراءة. دوّن أولى خواطرك الإيمانية وتأملاتك لآيات القرآن الكريم للرجوع إليها دائماً.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl inline-flex items-center gap-2 text-sm font-medium transition"
            id="create-first-note-btn"
          >
            <Plus className="h-4 w-4" />
            <span>ابدأ التدوين الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {notes.map((note) => (
            <div 
              key={note.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border ${note.pinned ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/5" : "border-slate-100 dark:border-slate-800"} flex flex-col justify-between hover:shadow-md transition duration-200 group relative`}
            >
              {/* Note Header & Actions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold">
                    {note.surahName} • آية {note.verseNumber}
                  </span>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleTogglePin(note)}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${note.pinned ? "text-emerald-600" : "text-slate-400"}`}
                      title="تثبيت في الأعلى"
                      id={`pin-btn-${note.id}`}
                    >
                      <Pin className={`h-4 w-4 ${note.pinned ? "fill-emerald-600" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(note)}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${note.isFavorite ? "text-amber-500" : "text-slate-400"}`}
                      title="إضافة للمفضلة"
                      id={`fav-btn-${note.id}`}
                    >
                      <Star className={`h-4 w-4 ${note.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(note)}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="تعديل الخاطرة"
                      id={`edit-btn-${note.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="حذف الخاطرة"
                      id={`delete-btn-${note.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Verse Text (classical style) */}
                <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-3.5 mb-4 border border-slate-100 dark:border-slate-800/80 text-center relative overflow-hidden">
                  <div className="absolute right-1 top-0 text-slate-200 dark:text-slate-800/40 text-4xl font-serif select-none pointer-events-none">﴿</div>
                  <p className="quran-font text-lg text-emerald-800 dark:text-emerald-300 leading-loose font-bold inline px-4 min-h-[2em] flex items-center justify-center">
                    {getAyahTextForNote(note)}
                  </p>
                  <div className="absolute left-1 bottom-0 text-slate-200 dark:text-slate-800/40 text-4xl font-serif select-none pointer-events-none">﴾</div>
                </div>

                {/* Reflection note text */}
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-4">
                  {note.reflectionText}
                </p>
              </div>

              {/* Note Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/50 text-xs">
                {/* Tags list */}
                <div className="flex items-center gap-1 flex-wrap">
                  {note.tags.map((t) => (
                    <span 
                      key={t}
                      onClick={() => setSelectedTagFilter(t)} 
                      className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded hover:opacity-80 cursor-pointer"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Timestamp */}
                <span className="text-slate-400">
                  {formatFirestoreDate(note.createdAt)}
                </span>
              </div>
            </div>
          );})}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-emerald-600" />
                {editingNote ? "تعديل خاطرة تدبرية" : "تدوين خاطرة تدبرية جديدة"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                إغلاق
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Quran Verse Selector Group */}
              <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-950/40 space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4" /> تحديد آية من القرآن الكريم
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">اختر السورة</label>
                    <select
                      value={formSurahId}
                      onChange={(e) => setFormSurahId(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                      id="form-surah-select"
                    >
                      {SURAHS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}. {s.name} ({s.verses} آية)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1" >
                      رقم الآية (الحد الأقصى: {selectedSurahMeta?.verses || 286})
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      min={1}
                      max={selectedSurahMeta?.verses || 286}
                      value={formVerseNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^[0-9]+$/.test(val)) {
                          setFormVerseNumber(val);
                        }
                      }}
                      onBlur={(e) => {
                        const maxVerse = selectedSurahMeta?.verses || 286;
                        let val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) val = 1;
                        if (val > maxVerse) val = maxVerse;
                        setFormVerseNumber(val);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                      id="form-verse-input"
                    />
                  </div>
                </div>

                {/* Popular / Verified Autocomplete Suggestor */}
                {!editingNote && (
                  <div className="pt-2 border-t border-emerald-100/50 dark:border-emerald-950/20">
                    <span className="block text-[11px] text-slate-400 mb-1.5">اقتراحات لآيات ملهمة جاهزة للتدبر:</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                      {VERIFIED_VERSES.slice(0, 7).map((vv) => (
                        <button
                          key={vv.id}
                          type="button"
                          onClick={() => handleAutofillFromVerified(vv)}
                          className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap transition cursor-pointer"
                        >
                          {vv.surahName} ({vv.verseNumber}) - {vv.topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preloaded Quranic scripture preview */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-center relative">
                <span className="absolute right-2 top-2 text-slate-300 dark:text-slate-800 text-xs font-semibold">نص الآية</span>
                <p className="quran-font text-lg text-emerald-800 dark:text-emerald-300 leading-loose font-bold px-4 py-2">
                  {getAutofilledVerseText() || `﴿ الآية رقم ${formVerseNumber} من سورة ${selectedSurahMeta?.name || "البقرة"} ﴾`}
                </p>
                {!getAutofilledVerseText() && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    سيتم عرض نص الآية تلقائياً عند الحفظ.
                  </p>
                )}
              </div>

              {/* Reflection text */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  تدبرك وخواطرك الإيمانية <span className="text-rose-500">*</span>
                </label>
                <textarea
                  placeholder="اكتب هنا ما يفيض به قلبك من تدبر، فوائد، أو لطائف إيمانية حول هذه الآية الكريمة..."
                  value={formReflection}
                  onChange={(e) => setFormReflection(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm h-36 resize-none"
                  id="form-reflection-textarea"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> التصنيفات (افصل بينها بمسافة)
                </label>
                <input
                  type="text"
                  placeholder="مثال: صبر طمأنينة دعاء"
                  value={formTagsString}
                  onChange={(e) => setFormTagsString(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  id="form-tags-input"
                />
                
                {/* Quick tags assist */}
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {popularTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = formTagsString.trim();
                        if (!current.includes(tag)) {
                          setFormTagsString(current ? `${current} ${tag}` : tag);
                        }
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300 rounded text-[10px] transition"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Switches (Pin, Favorite) */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                    id="form-pinned-checkbox"
                  />
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Pin className="h-3.5 w-3.5 text-slate-400" /> تثبيت الخاطرة في الأعلى
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={formFavorite}
                    onChange={(e) => setFormFavorite(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                    id="form-fav-checkbox"
                  />
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-slate-400" /> إضافة إلى المفضلة
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm transition font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-sm transition font-medium shadow-sm flex items-center gap-1.5"
                  id="form-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingNote ? "حفظ التعديلات" : "إضافة الخاطرة"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
