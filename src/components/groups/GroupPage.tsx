import React, { useState, useEffect } from "react";
import { User, QuranGroup, GroupReflection } from "../../types";
import { ArrowLeft, BookOpen, Users, Copy, Sparkles, MessageCircle, Heart, Star, Send } from "lucide-react";

interface GroupPageProps {
  group: QuranGroup;
  currentUser: User | null;
  onBack: () => void;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function GroupPage({ group, currentUser, onBack, onShowToast }: GroupPageProps) {
  const [reflections, setReflections] = useState<GroupReflection[]>([]);
  const [newReflection, setNewReflection] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = currentUser?.id === group.adminId;

  useEffect(() => {
    fetchReflections();
  }, [group.id]);

  const fetchReflections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/reflections`);
      if (res.ok) {
        const data = await res.json();
        setReflections(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newReflection.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/reflections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.displayName || currentUser.name || "عضو",
          surahId: group.surahId,
          surahName: group.surahName,
          verseRange: group.verseRange,
          reflectionText: newReflection
        })
      });
      
      if (res.ok) {
        setNewReflection("");
        fetchReflections();
        onShowToast("تم نشر التدبر في الحلقة", "success");
      }
    } catch (err) {
      onShowToast("حدث خطأ أثناء النشر", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.joinCode);
    onShowToast("تم نسخ رمز الدعوة", "success");
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in" dir="rtl">
      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{group.icon}</div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{group.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
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
                required
                value={newReflection}
                onChange={e => setNewReflection(e.target.value)}
                placeholder="ماذا تعلمت من الآيات؟ ما المعنى الذي أثّر فيك؟" 
                className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl resize-none font-medium text-sm focus:border-emerald-500 outline-none transition"
              />
              <div className="flex justify-end mt-3">
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition disabled:opacity-50">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "جاري النشر..." : "نشر التدبر"}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">تدبرات الأعضاء</h3>
            {isLoading ? (
              <div className="text-center py-10 text-slate-500 font-bold">جاري التحميل...</div>
            ) : reflections.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                لا توجد تدبرات بعد في هذا الورد، كن أول من يشارك!
              </div>
            ) : (
              reflections.map(ref => (
                <div key={ref.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {ref.userName.substring(0, 1)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{ref.userName}</span>
                        <span className="text-[10px] text-slate-400 block">تدبر شخصي لعضو</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(ref.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">ورد: سورة {ref.surahName} (آية {ref.verseRange})</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{ref.reflectionText}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-500 transition font-medium">
                      <Heart className="h-4 w-4" /> أثّر فيّ
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition font-medium">
                      <MessageCircle className="h-4 w-4" /> نقاش
                    </button>
                    {isAdmin && (
                      <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-500 transition font-medium mr-auto">
                        <Star className="h-4 w-4" /> تثبيت
                      </button>
                    )}
                  </div>
                </div>
              ))
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
              <p className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">{group.surahName}</p>
              <div className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                الآيات: {group.verseRange}
              </div>
            </div>
            {isAdmin && (
              <button className="w-full mt-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition">
                تحديث الورد الأسبوعي
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                أعضاء الحلقة
              </span>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500">{group.members.length} / {group.maxMembers}</span>
            </h3>
            <div className="space-y-3 mb-4">
              {group.members.map(member => (
                <div key={member.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                      {member.name.substring(0, 1)}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{member.name}</span>
                  </div>
                  {member.role === "admin" && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">مشرف</span>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 mb-2 font-medium">رمز دعوة للأعضاء الجدد:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-center text-sm font-bold text-slate-700 dark:text-slate-300">
                  {group.joinCode}
                </code>
                <button onClick={handleCopyCode} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-300">
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
