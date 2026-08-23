import React, { useEffect, useMemo, useState } from "react";
import { User, QuranGroup, GroupReflection } from "../../types";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Copy,
  Sparkles,
  MessageCircle,
  Heart,
  Star,
  Trash2,
  Send,
  Mic,
  Square,
} from "lucide-react";
import {
  getGroupReflections,
  addGroupReflection,
  toggleGroupReflectionReaction,
  updateGroupReflection,
  updateGroupWird,
  deleteGroupReflection,
} from "../../services/firestoreService";
import { formatFirestoreDate } from "../../utils/dateUtils";
import { SURAH_LIST, SURAH_VERSE_COUNTS } from "../../utils/quranUtils";

interface GroupPageProps {
  group: QuranGroup;
  currentUser: User | null;
  onBack: () => void;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

interface ReflectionComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

type ReflectionWithExtras = GroupReflection & {
  comments?: ReflectionComment[];
  isPinned?: boolean;
  reactionUserIds?: string[];
};

type MemberLike = {
  userId: string;
  name: string;
  role?: "admin" | "member" | string;
  joinedAt?: string;
};

function getUserDisplayName(user: User | null) {
  return user?.displayName || user?.name || "عضو";
}

function getFirstLetter(value?: string) {
  const safeValue = (value || "عضو").trim();
  return safeValue.substring(0, 1) || "ع";
}

function clampSurahId(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(114, Math.floor(parsed)));
}

function getSurahInfo(surahId: number) {
  return SURAH_LIST.find((surah) => surah.id === surahId) || SURAH_LIST[0];
}

function getMaxVerseForSurah(surahId: number) {
  const safeSurahId = clampSurahId(surahId);
  const fromCount = SURAH_VERSE_COUNTS[safeSurahId - 1];
  const fromList = getSurahInfo(safeSurahId)?.verses;

  return Number(fromCount || fromList || 1);
}

function getSafeVerseRange(surahId: number) {
  return `1 - ${getMaxVerseForSurah(surahId)}`;
}

export default function GroupPage({
  group,
  currentUser,
  onBack,
  onShowToast,
}: GroupPageProps) {
  const [localGroup, setLocalGroup] = useState<QuranGroup>(group);
  const [reflections, setReflections] = useState<ReflectionWithExtras[]>([]);
  const [newReflection, setNewReflection] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const [activeDiscussionId, setActiveDiscussionId] = useState<string | null>(
    null
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>(
    {}
  );

  const [isUpdatingWird, setIsUpdatingWird] = useState(false);
  const [isSavingWird, setIsSavingWird] = useState(false);
  const [weeklySurahId, setWeeklySurahId] = useState<number>(
    clampSurahId((group as any).surahId)
  );
  const [weeklyStartVerse, setWeeklyStartVerse] = useState<number | string>(1);
  const [weeklyEndVerse, setWeeklyEndVerse] = useState<number | string>(7);

  const currentSurahId = clampSurahId((localGroup as any).surahId);
  const currentSurah = getSurahInfo(currentSurahId);
  
  // Fix legacy groups that might have string verse ranges exceeding actual verses
  const currentVerseRange = useMemo(() => {
    const rawRange = (localGroup as any).verseRange;
    if (typeof rawRange === 'string' && rawRange.includes('-')) {
      const parts = rawRange.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).split('-');
      const maxVerses = currentSurah.verses;
      const start = Math.min(parseInt(parts[0].trim()) || 1, maxVerses);
      const end = Math.min(parseInt(parts[1].trim()) || maxVerses, maxVerses);
      return `${start} - ${end}`;
    }
    return getSafeVerseRange(currentSurahId);
  }, [localGroup, currentSurahId, currentSurah]);

  const isAdmin =
    !!currentUser &&
    (currentUser.id === (localGroup as any).adminId ||
      currentUser.id === (localGroup as any).createdBy);

  const members: MemberLike[] = Array.isArray((localGroup as any).members)
    ? ((localGroup as any).members as MemberLike[])
    : [];

  const memberIds: string[] = Array.isArray((localGroup as any).memberIds)
    ? ((localGroup as any).memberIds as string[])
    : [];

  const membersCount = Math.max(members.length, memberIds.length);
  const maxMembers = (localGroup as any).maxMembers || 20;

  const missingMemberIds = memberIds.filter(
    (id) => !members.some((member) => member.userId === id)
  );

  const displayedMembers: MemberLike[] = [
    ...members,
    ...missingMemberIds.map((id) => ({
      userId: id,
      name: id === currentUser?.id ? getUserDisplayName(currentUser) : "عضو منضم",
      role: "member",
    })),
  ];

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!isAdmin) {
      onShowToast("صلاحية الإزالة للمشرف فقط", "error");
      return;
    }
    
    if (memberIdToRemove === currentUser?.id) {
      onShowToast("لا يمكنك إزالة نفسك بهذه الطريقة", "info");
      return;
    }

    const confirmed = window.confirm("هل أنت متأكد من إزالة هذا العضو من الحلقة؟");
    if (!confirmed) return;

    try {
      const { kickGroupMember } = await import("../../services/firestoreService");
      await kickGroupMember(localGroup.id, memberIdToRemove);
      
      const newMembers = displayedMembers.filter(m => m.userId !== memberIdToRemove);
      const newMemberIds = memberIds.filter(id => id !== memberIdToRemove);
      
      setLocalGroup(prev => ({
        ...prev,
        members: newMembers,
        memberIds: newMemberIds,
        membersCount: newMemberIds.length
      } as any));
      
      onShowToast("تم إزالة العضو بنجاح", "success");
    } catch (err) {
      console.error(err);
      onShowToast("حدث خطأ أثناء إزالة العضو", "error");
    }
  };

  const sortedReflections = useMemo(() => {
    return [...reflections].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [reflections]);

  useEffect(() => {
    setLocalGroup(group);
    const sId = clampSurahId((group as any).surahId);
    setWeeklySurahId(sId);
    
    // Parse the current verse range to pre-fill the update form
    const rawRange = (group as any).verseRange;
    if (typeof rawRange === 'string' && rawRange.includes('-')) {
      const parts = rawRange.replace(/[٠-٩]/g, (d: string) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).split('-');
      setWeeklyStartVerse(parseInt(parts[0].trim()) || 1);
      setWeeklyEndVerse(parseInt(parts[1].trim()) || getMaxVerseForSurah(sId));
    } else {
      setWeeklyStartVerse(1);
      setWeeklyEndVerse(getMaxVerseForSurah(sId));
    }
  }, [group]);

  useEffect(() => {
    fetchReflections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localGroup.id]);

  const fetchReflections = async () => {
    setIsLoading(true);

    try {
      const data = await getGroupReflections(localGroup.id);
      setReflections(
        (Array.isArray(data) ? data : []) as ReflectionWithExtras[]
      );
    } catch (err) {
      console.error("Error loading group reflections:", err);
      onShowToast("تعذر تحميل تدبرات الحلقة", "error");
      setReflections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReflection = async (reflectionId: string, audioUrl?: string) => {
    if (!isAdmin) {
      onShowToast("لا تملك صلاحية الحذف", "error");
      return;
    }
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا التدبر بشكل نهائي؟");
    if (!confirmed) return;
    try {
      await deleteGroupReflection(localGroup.id, reflectionId, audioUrl);
      setReflections((prev) => prev.filter((r) => r.id !== reflectionId));
      onShowToast("تم حذف التدبر", "success");
    } catch (err) {
      onShowToast("تعذر حذف التدبر", "error");
    }
  };

  const handleDeleteComment = async (reflectionId: string, commentId: string) => {
    if (!isAdmin) {
      onShowToast("لا تملك صلاحية الحذف", "error");
      return;
    }
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا التعليق؟");
    if (!confirmed) return;
    
    const reflection = reflections.find(r => r.id === reflectionId);
    if (!reflection) return;
    
    const newComments = reflection.comments?.filter(c => c.id !== commentId) || [];
    
    try {
      await updateGroupReflection(localGroup.id, reflectionId, { comments: newComments } as any);
      setReflections((prev) => prev.map((r) => r.id === reflectionId ? { ...r, comments: newComments } : r));
      onShowToast("تم حذف التعليق", "success");
    } catch (err) {
      onShowToast("تعذر حذف التعليق", "error");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = ''; // fallback to default
      }
      
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      onShowToast("تعذر الوصول للميكروفون، يرجى السماح بذلك من إعدادات المتصفح", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onShowToast("يجب تسجيل الدخول أولًا", "error");
      return;
    }

    const trimmedReflection = newReflection.trim();

    if (!trimmedReflection && !audioBlob) {
      onShowToast("اكتب التدبر أو سجل رسالة صوتية أولًا", "info");
      return;
    }

    setIsSubmitting(true);

    try {
      let currentAudioBlob = audioBlob;
      // Prevent submit if currently recording
      if (isRecording) {
        onShowToast("يرجى إيقاف التسجيل الصوتي أولاً قبل النشر", "info");
        setIsSubmitting(false);
        return;
      }

      await addGroupReflection(localGroup.id, {
        userId: currentUser.id,
        userName: getUserDisplayName(currentUser),
        surahId: currentSurahId,
        surahName: currentSurah?.name || (localGroup as any).surahName || "",
        verseRange: currentVerseRange,
        reflectionText: trimmedReflection,
        reactionUserIds: [],
        comments: [],
        isPinned: false,
      } as any, currentAudioBlob || undefined);

      setNewReflection("");
      clearAudio();
      await fetchReflections();
      onShowToast("تم نشر التدبر في الحلقة", "success");
    } catch (err) {
      console.error("Error submitting reflection:", err);
      onShowToast("حدث خطأ أثناء نشر التدبر", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    const joinCode = (localGroup as any).joinCode || "";

    if (!joinCode) {
      onShowToast("لا يوجد رمز دعوة لهذه الحلقة", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(joinCode);
      onShowToast("تم نسخ رمز الدعوة", "success");
    } catch (err) {
      console.error("Error copying join code:", err);
      onShowToast("تعذر نسخ رمز الدعوة", "error");
    }
  };

  const handleToggleReaction = async (reflectionId: string) => {
    if (!currentUser) {
      onShowToast("يجب تسجيل الدخول أولًا", "error");
      return;
    }

    setReflections((prev) =>
      prev.map((reflection) => {
        if (reflection.id !== reflectionId) return reflection;

        const currentReactions = reflection.reactionUserIds || [];
        const alreadyReacted = currentReactions.includes(currentUser.id);

        const nextReactions = alreadyReacted
          ? currentReactions.filter((id) => id !== currentUser.id)
          : [...currentReactions, currentUser.id];

        return {
          ...reflection,
          reactionUserIds: nextReactions,
        };
      })
    );

    try {
      await toggleGroupReflectionReaction(
        localGroup.id,
        reflectionId,
        currentUser.id
      );
    } catch (err) {
      console.error("Error toggling reaction:", err);
      onShowToast("تعذر تنفيذ أثّر فيّ. تحقق من الصلاحيات.", "error");
      await fetchReflections();
    }
  };

  const handleTogglePin = async (reflection: ReflectionWithExtras) => {
    if (!currentUser) {
      onShowToast("يجب تسجيل الدخول أولًا", "error");
      return;
    }

    if (!isAdmin) {
      onShowToast("التثبيت متاح للمشرف فقط", "info");
      return;
    }

    try {
      await updateGroupReflection(localGroup.id, reflection.id, {
        isPinned: !reflection.isPinned,
      } as any);

      await fetchReflections();

      onShowToast(
        reflection.isPinned ? "تم إلغاء تثبيت التدبر" : "تم تثبيت التدبر",
        "success"
      );
    } catch (err) {
      console.error("Error toggling pin:", err);
      onShowToast("تعذر تنفيذ التثبيت. تحقق من الصلاحيات.", "error");
    }
  };

  const handleAddComment = async (reflection: ReflectionWithExtras) => {
    if (!currentUser) {
      onShowToast("يجب تسجيل الدخول أولًا", "error");
      return;
    }

    const text = (commentDrafts[reflection.id] || "").trim();

    if (!text) {
      onShowToast("اكتب تعليقًا أولًا", "info");
      return;
    }

    setCommentLoading((prev) => ({
      ...prev,
      [reflection.id]: true,
    }));

    try {
      const existingComments = Array.isArray(reflection.comments)
        ? reflection.comments
        : [];

      const newComment: ReflectionComment = {
        id: `${Date.now()}-${currentUser.id}`,
        userId: currentUser.id,
        userName: getUserDisplayName(currentUser),
        text,
        createdAt: new Date().toISOString(),
      };

      await updateGroupReflection(localGroup.id, reflection.id, {
        comments: [...existingComments, newComment],
      } as any);

      setCommentDrafts((prev) => ({
        ...prev,
        [reflection.id]: "",
      }));

      await fetchReflections();
      onShowToast("تمت إضافة النقاش", "success");
    } catch (err) {
      console.error("Error adding comment:", err);
      onShowToast("تعذر إضافة النقاش. تحقق من الصلاحيات.", "error");
    } finally {
      setCommentLoading((prev) => ({
        ...prev,
        [reflection.id]: false,
      }));
    }
  };

  const handleUpdateWeeklyWird = async () => {
    if (!currentUser) {
      onShowToast("يجب تسجيل الدخول أولًا", "error");
      return;
    }

    if (!isAdmin) {
      onShowToast("تحديث الورد متاح للمشرف فقط", "info");
      return;
    }

    const safeSurahId = clampSurahId(weeklySurahId);
    const selectedSurah = getSurahInfo(safeSurahId);
    const maxVerse = getMaxVerseForSurah(safeSurahId);
    
    const safeStart = Math.max(1, Math.min(maxVerse, Number(weeklyStartVerse) || 1));
    const safeEnd = Math.max(safeStart, Math.min(maxVerse, Number(weeklyEndVerse) || maxVerse));
    const safeVerseRange = `${safeStart} - ${safeEnd}`;

    setIsSavingWird(true);

    try {
      await updateGroupWird(localGroup.id, {
        surahId: safeSurahId,
        surahName: selectedSurah.name,
        verseRange: safeVerseRange,
      });

      setLocalGroup((prev) => ({
        ...prev,
        surahId: safeSurahId,
        surahName: selectedSurah.name,
        verseRange: safeVerseRange,
      }));

      setIsUpdatingWird(false);
      onShowToast("تم تحديث الورد الأسبوعي", "success");
    } catch (err) {
      console.error("Error updating weekly wird:", err);
      onShowToast("تعذر تحديث الورد. تحقق من الصلاحيات.", "error");
    } finally {
      setIsSavingWird(false);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in" dir="rtl">
      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-3xl">{(localGroup as any).icon || "🍃"}</div>

          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              {(localGroup as any).name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {(localGroup as any).description || "حلقة تدبر قرآني"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              شاركنا تدبرك
            </h3>

            <form onSubmit={handleSubmitReflection}>
              <textarea
                required={!audioBlob}
                value={newReflection}
                onChange={(e) => setNewReflection(e.target.value)}
                placeholder="ماذا تعلمت من الآيات؟ ما المعنى الذي أثّر فيك؟ (أو سجل تدبرك صوتياً)"
                className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl resize-none font-medium text-sm focus:border-emerald-500 outline-none transition"
              />

              {audioUrl && (
                <div className="mt-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <audio src={audioUrl} controls className="h-8 flex-1" />
                  <button
                    type="button"
                    onClick={clearAudio}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                    title="حذف التسجيل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {!audioUrl && (
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                        isRecording 
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      {isRecording ? "إيقاف التسجيل..." : "تسجيل صوتي"}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (newReflection.trim() === "" && !audioBlob)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "جاري النشر..." : "نشر التدبر"}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">
              تدبرات الأعضاء
            </h3>

            {isLoading ? (
              <div className="text-center py-10 text-slate-500 font-bold">
                جاري التحميل...
              </div>
            ) : sortedReflections.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                لا توجد تدبرات بعد في هذا الورد، كن أول من يشارك!
              </div>
            ) : (
              sortedReflections.map((ref) => {
                const reactionUserIds = ref.reactionUserIds || [];
                const isReactedByMe = reactionUserIds.includes(
                  currentUser?.id || ""
                );
                const comments = Array.isArray(ref.comments) ? ref.comments : [];
                const isDiscussionOpen = activeDiscussionId === ref.id;

                return (
                  <div
                    key={ref.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-3 ${
                      ref.isPinned
                        ? "border-amber-200 dark:border-amber-900/50"
                        : "border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    {ref.isPinned && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold">
                        <Star className="h-3 w-3 fill-current" />
                        تدبر مثبت
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {getFirstLetter(ref.userName)}
                        </div>

                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {ref.userName || "عضو"}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            تدبر شخصي لعضو
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatFirestoreDate((ref as any).createdAt)}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteReflection(ref.id, ref.audioUrl)}
                            className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1 rounded transition"
                            title="حذف التدبر"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                        ورد: سورة {ref.surahName || currentSurah.name} آية{" "}
                        {ref.verseRange || currentVerseRange}
                      </span>

                      {ref.reflectionText && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mb-2">
                          {ref.reflectionText}
                        </p>
                      )}
                      
                      {ref.audioUrl && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <audio src={ref.audioUrl} controls className="w-full h-8" />
                        </div>
                      )}
                      
                      {!ref.reflectionText && !ref.audioUrl && (
                        <p className="text-sm text-slate-400 italic">لا يوجد محتوى للتدبر</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleReaction(ref.id)}
                        className={`flex items-center gap-1.5 text-xs transition font-medium ${
                          isReactedByMe
                            ? "text-rose-500"
                            : "text-slate-500 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            isReactedByMe ? "fill-current" : ""
                          }`}
                        />
                        أثّر فيّ ({reactionUserIds.length})
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveDiscussionId(
                            isDiscussionOpen ? null : ref.id
                          )
                        }
                        className={`flex items-center gap-1.5 text-xs transition font-medium ${
                          isDiscussionOpen
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-500 hover:text-emerald-600"
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        نقاش {comments.length > 0 ? `(${comments.length})` : ""}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(ref)}
                        className={`flex items-center gap-1.5 text-xs transition font-medium mr-auto ${
                          ref.isPinned
                            ? "text-amber-500"
                            : "text-slate-500 hover:text-amber-500"
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            ref.isPinned ? "fill-current" : ""
                          }`}
                        />
                        {ref.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                      </button>
                    </div>

                    {isDiscussionOpen && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="space-y-2">
                          {comments.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2">
                              لا توجد مناقشات بعد. كن أول من يعلّق.
                            </p>
                          ) : (
                            comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-3"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {comment.userName || "عضو"}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">
                                      {formatFirestoreDate(comment.createdAt)}
                                    </span>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteComment(ref.id, comment.id)}
                                        className="text-red-400 hover:text-red-600 transition"
                                        title="حذف التعليق"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {comment.text}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentDrafts[ref.id] || ""}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [ref.id]: e.target.value,
                              }))
                            }
                            placeholder="اكتب نقاشك حول هذا التدبر..."
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />

                          <button
                            type="button"
                            onClick={() => handleAddComment(ref)}
                            disabled={commentLoading[ref.id]}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {commentLoading[ref.id] ? "جاري..." : "إرسال"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              الورد الحالي
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500 mb-1">سورة</p>

              <p className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
                {currentSurah.name}
              </p>

              <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                الآيات: {currentVerseRange}
              </div>
            </div>

            {isAdmin && (
              <div className="mt-3 space-y-3">
                {!isUpdatingWird ? (
                  <button
                    type="button"
                    onClick={() => setIsUpdatingWird(true)}
                    className="w-full py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition"
                  >
                    تحديث الورد الأسبوعي
                  </button>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 space-y-3">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                      اختر السورة
                    </label>

                    <select
                      value={weeklySurahId}
                      onChange={(e) => {
                        const surahId = Number(e.target.value);
                        setWeeklySurahId(surahId);
                        setWeeklyStartVerse(1);
                        setWeeklyEndVerse(getMaxVerseForSurah(surahId));
                      }}
                      className="w-full px-3 py-2 border rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      {SURAH_LIST.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}. {s.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={weeklyStartVerse}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]+$/.test(val)) setWeeklyStartVerse(val);
                        }}
                        onBlur={(e) => {
                          const maxVerse = getMaxVerseForSurah(weeklySurahId);
                          let val = parseInt(e.target.value);
                          if (isNaN(val) || val < 1) val = 1;
                          if (val > maxVerse) val = maxVerse;
                          if (val > Number(weeklyEndVerse)) val = Number(weeklyEndVerse);
                          setWeeklyStartVerse(val);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 text-center"
                        placeholder="من آية"
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={weeklyEndVerse}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]+$/.test(val)) setWeeklyEndVerse(val);
                        }}
                        onBlur={(e) => {
                          const maxVerse = getMaxVerseForSurah(weeklySurahId);
                          let val = parseInt(e.target.value);
                          if (isNaN(val)) val = maxVerse;
                          if (val > maxVerse) val = maxVerse;
                          if (val < Number(weeklyStartVerse)) val = Number(weeklyStartVerse);
                          setWeeklyEndVerse(val);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 text-center"
                        placeholder="إلى آية"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateWeeklyWird}
                        disabled={isSavingWird}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition"
                      >
                        {isSavingWird ? "جاري الحفظ..." : "حفظ الورد"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsUpdatingWird(false)}
                        disabled={isSavingWird}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition disabled:opacity-50"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                أعضاء الحلقة
              </span>

              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500">
                {membersCount} من {maxMembers}
              </span>
            </h3>

            <div className="space-y-3 mb-4">
              {displayedMembers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  لا توجد بيانات أعضاء متاحة الآن.
                </p>
              ) : (
                displayedMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                        {getFirstLetter(member.name)}
                      </div>

                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {member.name || "عضو"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && member.userId !== currentUser?.id && member.role !== "admin" && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-0.5 rounded transition-opacity"
                          title="إزالة العضو"
                        >
                          إزالة
                        </button>
                      )}
                      {member.role === "admin" ? (
                        <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                          مشرف
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                          عضو
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {missingMemberIds.length > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-3 leading-relaxed">
                يوجد أعضاء انضموا بالكود لكن أسماء بعضهم غير محفوظة في بيانات
                الحلقة القديمة. سيتم إظهار أسمائهم تلقائيًا بعد تحديث دالة
                الانضمام.
              </p>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2 font-medium">
                رمز دعوة للأعضاء الجدد:
              </p>

              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-center text-sm font-bold text-slate-700 dark:text-slate-300">
                  {(localGroup as any).joinCode || "غير متاح"}
                </code>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-300"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}