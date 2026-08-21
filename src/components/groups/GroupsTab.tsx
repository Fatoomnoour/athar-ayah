import React, { useState, useEffect } from "react";
import { User, QuranGroup } from "../../types";
import { Users, Plus, Key, BookOpen, CalendarDays, Trash2, LogOut } from "lucide-react";
import GroupPage from "./GroupPage";
import { getUserGroups, createGroup, joinGroup, archiveGroup, leaveGroup } from "../../services/firestoreService";
import { SURAH_LIST, SURAH_VERSE_COUNTS } from "../../utils/quranUtils";

interface GroupsTabProps {
  currentUser: User | null;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function GroupsTab({ currentUser, onShowToast }: GroupsTabProps) {
  const [groups, setGroups] = useState<QuranGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeGroup, setActiveGroup] = useState<QuranGroup | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const [joinCode, setJoinCode] = useState("");
  const [newGroupData, setNewGroupData] = useState({
    name: "",
    description: "",
    icon: "🍃",
    surahId: 1,
    surahName: "الفاتحة",
    verseRange: "١ - ٧",
    goalType: "daily" as "daily" | "weekly",
    maxMembers: 20
  });

  const getGroupMillis = (value: any): number => {
    if (!value) return 0;

    if (typeof value?.toMillis === "function") {
      return value.toMillis();
    }

    if (typeof value?.seconds === "number") {
      return value.seconds * 1000;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatGroupDate = (value: any) => {
    const ms = getGroupMillis(value);
    if (!ms) return "تاريخ الإنشاء غير متوفر";

    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(ms));
  };

  const isGroupAdmin = (group: QuranGroup) => {
    if (!currentUser) return false;

    return (
      group.adminId === currentUser.id ||
      (group as any).createdBy === currentUser.id ||
      group.members?.some(
        (member) => member.userId === currentUser.id && member.role === "admin"
      )
    );
  };

  const handleArchiveGroup = async (
    group: QuranGroup,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();

    if (!currentUser) return;

    if (!isGroupAdmin(group)) {
      onShowToast("حذف الحلقة متاح لصاحبة الحلقة فقط", "error");
      return;
    }

    const confirmed = window.confirm(
      `هل تريدين حذف حلقة "${group.name}"؟
سيتم إخفاؤها من قائمة الحلقات دون حذف بياناتها نهائيًا.`
    );

    if (!confirmed) return;

    try {
      await archiveGroup(currentUser.id, group.id);
      setGroups((prev) => prev.filter((item) => item.id !== group.id));
      onShowToast("تم حذف الحلقة بنجاح", "success");
    } catch (err: any) {
      console.error(err);
      onShowToast(err?.message || "تعذر حذف الحلقة", "error");
    }
  };

  const handleLeaveGroup = async (
    group: QuranGroup,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();

    if (!currentUser) return;

    if (isGroupAdmin(group)) {
      onShowToast("لا يمكن لصاحبة الحلقة مغادرتها قبل حذفها أو نقل الملكية.", "error");
      return;
    }

    const confirmed = window.confirm(
      `هل تريدين مغادرة حلقة "${group.name}"؟`
    );

    if (!confirmed) return;

    try {
      await leaveGroup(currentUser.id, group.id);
      setGroups((prev) => prev.filter((item) => item.id !== group.id));
      onShowToast("تمت مغادرة الحلقة بنجاح", "success");
    } catch (err: any) {
      console.error(err);
      onShowToast(err?.message || "تعذر مغادرة الحلقة", "error");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUser, activeGroup]);

  const fetchGroups = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userGroups = await getUserGroups(currentUser.id);
      setGroups(userGroups);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const adminMember = {
        userId: currentUser.id,
        name: currentUser.displayName || currentUser.name || "عضو",
        role: "admin" as const,
        joinedAt: new Date().toISOString()
      };

      const createdGroupId = await createGroup(currentUser.id, {
        ...newGroupData,
        joinCode: code,
        adminId: currentUser.id,
        members: [adminMember]
      });

      const localGroup: QuranGroup = {
        id: createdGroupId || `local-${Date.now()}`,
        ...newGroupData,
        joinCode: code,
        adminId: currentUser.id,
        members: [adminMember],
        reflections: [],
        createdAt: new Date().toISOString(),
        ...( { createdBy: currentUser.id, memberIds: [currentUser.id], isArchived: false, status: "active" } as any ),
      };
      
      setGroups((prev) => [localGroup, ...prev.filter((group) => group.id !== localGroup.id)]);
      setIsCreating(false);
      fetchGroups();
      onShowToast("تم إنشاء حلقة التدبر بنجاح!", "success");
    } catch (err) {
      onShowToast("حدث خطأ أثناء الإنشاء", "error");
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      onShowToast("يرجى إدخال رمز الانضمام", "error");
      return;
    }

    if (!currentUser) return;
    
    try {
      await joinGroup(currentUser.id, joinCode.trim().toUpperCase(), currentUser.displayName || currentUser.name || "عضو");
      setIsJoining(false);
      setJoinCode("");
      fetchGroups();
      onShowToast("تم الانضمام للحلقة بنجاح!", "success");
    } catch (err: any) {
      onShowToast(err.message || "رمز الانضمام غير صحيح أو حدث خطأ", "error");
    }
  };

  if (activeGroup) {
    return (
      <GroupPage 
        group={activeGroup} 
        currentUser={currentUser} 
        onBack={() => setActiveGroup(null)} 
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            حلقات التدبر
          </h2>
          <p className="text-sm text-slate-500 mt-1">تدارس القرآن وتدبر آياته مع صحبة صالحة.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setIsJoining(true); setIsCreating(false); }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-2 transition"
          >
            <Key className="h-4 w-4" />
            انضمام لحلقة
          </button>
          <button 
            onClick={() => { setIsCreating(true); setIsJoining(false); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            تأسيس حلقة
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateGroup} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">تأسيس حلقة تدبر جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">اسم الحلقة</label>
              <input required type="text" value={newGroupData.name} onChange={e => setNewGroupData({...newGroupData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">أيقونة الحلقة (إيموجي)</label>
              <input required type="text" value={newGroupData.icon} onChange={e => setNewGroupData({...newGroupData, icon: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">وصف الحلقة وأهدافها</label>
              <input type="text" value={newGroupData.description} onChange={e => setNewGroupData({...newGroupData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">الورد الحالي (السورة)</label>
              <select
                required
                value={newGroupData.surahId}
                onChange={e => {
                  const surahId = Number(e.target.value);
                  const surah = SURAH_LIST.find(s => s.id === surahId);
                  if (surah) {
                    const maxVerses = SURAH_VERSE_COUNTS[surahId - 1] || surah.verses;
                    setNewGroupData({
                      ...newGroupData,
                      surahId,
                      surahName: surah.name,
                      verseRange: `1 - ${maxVerses}`
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm"
              >
                {SURAH_LIST.map((surah) => (
                  <option key={surah.id} value={surah.id}>
                    {surah.id}. {surah.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">نطاق الآيات</label>
              <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-500">
                {newGroupData.verseRange}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">إلغاء</button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm">تأسيس وبدء</button>
          </div>
        </form>
      )}

      {isJoining && (
        <form onSubmit={handleJoinGroup} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">الانضمام لحلقة</h3>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">رمز الدعوة السري</label>
            <input required type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm uppercase text-center tracking-widest" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsJoining(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">إلغاء</button>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm">تأكيد الانضمام</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-slate-500 font-bold">جاري تحميل الحلقات...</div>
      ) : groups.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 dark:text-slate-300 mb-1">لا توجد حلقات مشتركة</h3>
          <p className="text-sm text-slate-400">ابدأ بإنشاء حلقة جديدة أو انضم عبر رمز الدعوة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => {
            const admin = isGroupAdmin(group);
            const membersCount = Array.isArray(group.members) ? group.members.length : Number((group as any).membersCount || 0);

            return (
              <div 
                key={group.id} 
                onClick={() => setActiveGroup(group)}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl">{group.icon}</div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {membersCount}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{group.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.description}</p>
                  <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    أُنشئت في: {formatGroupDate(group.createdAt)}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 space-y-3">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 group-hover:text-emerald-500 transition">
                    <BookOpen className="h-4 w-4" /> 
                    سورة {group.surahName} (الآيات: {group.verseRange.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).split('-').map(v => {
                      const num = parseInt(v.trim());
                      const surah = SURAH_LIST.find(s => s.name === group.surahName || s.id === (group as any).surahId);
                      const max = surah ? surah.verses : 286;
                      return !isNaN(num) && num > max ? max : v.trim();
                    }).join(' - ')})
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    {admin ? (
                      <button
                        type="button"
                        onClick={(event) => handleArchiveGroup(group, event)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 transition"
                        title="حذف الحلقة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف الحلقة
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => handleLeaveGroup(group, event)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition"
                        title="مغادرة الحلقة"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        مغادرة الحلقة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
