import React, { useState, useEffect } from "react";
import { 
  Settings, User as UserIcon, BookOpen, ShieldAlert, Check, Loader, Info, Bell, BellOff, RefreshCw, AlertTriangle
} from "lucide-react";
import { User, ReadingProgress } from "../types";
import { requestNotificationPermission, scheduleLocalNotification } from "../utils/notifications";
import { getReadingProgress, saveReadingProgress, resetUserJourney } from "../services/firestoreService";
import { clearTranslationCache } from "../services/translationCache";
import { updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useLanguage } from "../i18n";

interface SettingsPageProps {
  currentUser: User | null;
  onUpdateUser: (updatedUser: User) => void;
  onAccountReset: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  onRefreshStats: () => void;
}

export default function SettingsPage({
  currentUser,
  onUpdateUser,
  onAccountReset,
  onShowToast,
  onRefreshStats
}: SettingsPageProps) {
  const { language, direction, setLanguage, t } = useLanguage();
  const [displayName, setDisplayName] = useState<string>("");
  const [dailyGoal, setDailyGoal] = useState<number>(10);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearTranslationCache();
      onShowToast(language === "ar" ? "تم مسح الذاكرة المؤقتة للترجمات بنجاح" : "Translation cache cleared successfully", "success");
    } catch (error) {
      onShowToast(language === "ar" ? "حدث خطأ أثناء مسح الذاكرة المؤقتة" : "Failed to clear cache", "error");
    } finally {
      setIsClearingCache(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || "");
      fetchGoal();
      // Check notification permission state
      if ("Notification" in window && Notification.permission === "granted") {
        setNotificationsEnabled(localStorage.getItem(`notifs_${currentUser.id}`) !== "false");
      }
    }
  }, [currentUser]);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        if (currentUser) localStorage.setItem(`notifs_${currentUser.id}`, "true");
        onShowToast("تم تفعيل الإشعارات بنجاح. سيتم تذكيرك يومياً.", "success");
        
        // Use scheduleLocalNotification from utils if available, or fallback to direct notification
        try {
          scheduleLocalNotification("أهلاً بك في أثر آية!", { body: "سيتم تذكيرك بوردك اليومي والمراجعة من هنا." });
        } catch (e) {
          if (Notification.permission === "granted") {
            new Notification("أهلاً بك في أثر آية!", { body: "سيتم تذكيرك بوردك اليومي والمراجعة من هنا.", icon: "/icons/icon-192x192.jpg" });
          }
        }
      } else {
        onShowToast("يرجى السماح للإشعارات من إعدادات المتصفح أو النظام", "error");
      }
    } else {
      setNotificationsEnabled(false);
      if (currentUser) localStorage.setItem(`notifs_${currentUser.id}`, "false");
      onShowToast("تم إيقاف الإشعارات", "info");
    }
  };

  const fetchGoal = async () => {
    if (!currentUser) return;
    try {
      const data = await getReadingProgress(currentUser.id);
      if (data) {
        setDailyGoal(data.dailyGoalVerses || 10);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast("الرجاء تسجيل الدخول أولاً لتعديل الإعدادات", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName
        });
      }

      await saveReadingProgress(currentUser.id, {
        dailyGoalVerses: Number(dailyGoal),
        language,
      });

      onUpdateUser({ ...currentUser, name: displayName, language });
      onShowToast(t("settingsSaved"), "success");
      onRefreshStats();
    } catch (err) {
      onShowToast("فشل حفظ التعديلات، يرجى المحاولة لاحقاً", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetJourney = async () => {
    if (!currentUser || resetConfirmText !== "بدء رحلة جديدة") {
      onShowToast("النص المدخل غير مطابق للتأكيد.", "error");
      return;
    }

    setIsResetting(true);
    try {
      await resetUserJourney(currentUser.id);
      onShowToast("تم بدء رحلة جديدة بنجاح.", "success");
      setIsResetModalOpen(false);
      setResetConfirmText("");
      onAccountReset(); // This will trigger a full data refresh in App.tsx
    } catch (err: any) {
      console.error("Error resetting journey:", err);
      onShowToast(err.message || "تعذر بدء رحلة جديدة. حاولي مرة أخرى.", "error");
    } finally {
      setIsResetting(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6 text-right font-sans" dir={direction}>
      
      <div className="flex items-center gap-2 border-b pb-4">
        <Settings className="h-5.5 w-5.5 text-emerald-600" />
        <h2 className="text-base font-black text-slate-800 dark:text-white">{t("settingsTitle")}</h2>
      </div>

      {currentUser ? (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Language preference */}
          <div className="space-y-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4">
            <label htmlFor="settings-language" className="block text-xs font-black text-emerald-700 dark:text-emerald-300">{t("language")}</label>
            <select
              id="settings-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as "ar" | "en")}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ar">{t("arabic")}</option>
              <option value="en">{t("english")}</option>
            </select>
            <p className="text-[10px] leading-relaxed text-emerald-800/70 dark:text-emerald-300/70">{t("languageHelp")}</p>
          </div>

          {/* Section 1: User Profile */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" />
              <span>المعلومات الشخصية</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">البريد الإلكتروني الحالي:</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3 py-2 text-xs bg-slate-150 dark:bg-slate-800 text-slate-400 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">الاسم المستعار / الظاهر:</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: عبد الله بن محمد"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  id="settings-display-name-input"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Reading Targets */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span>أهداف القراءة والحفظ</span>
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5">الورد اليومي (عدد الآيات المستهدفة يومياً):</label>
              <select
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border rounded-xl cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                id="settings-daily-goal-selector"
              >
                <option value={5}>٥ آيات يومياً (قراءة سريعة)</option>
                <option value={10}>١٠ آيات يومياً (مناسب للتدبر العميق)</option>
                <option value={20}>٢٠ آية يومياً (نصف صفحة تقريباً)</option>
                <option value={50}>٥٠ آية يومياً (صفحة ونصف)</option>
                <option value={100}>١٠٠ آية يومياً (ورد الحفاظ النشطين)</option>
              </select>
              <p className="text-[9px] text-slate-400 mt-1">يساعدك تحديد هدف الورد في تعزيز استمرارية التلاوة وضبط منبه المتابعة.</p>
            </div>
          </div>

          {/* Section 2.4: Data Management */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" />
              <span>{language === "ar" ? "إدارة البيانات" : "Data Management"}</span>
            </h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="space-y-1 text-right max-w-[70%]">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "ar" ? "مسح الذاكرة المؤقتة للترجمات" : "Clear Translation Cache"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {language === "ar" ? "يمسح التراجم المحفوظة محلياً لحل مشاكل العرض أو توفير مساحة" : "Clears locally saved translations to resolve display issues or save space"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearingCache}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isClearingCache
                    ? "bg-slate-200 text-slate-400"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}
              >
                {isClearingCache ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : (language === "ar" ? "مسح الكاش" : "Clear Cache")}
              </button>
            </div>
          </div>

          {/* Section 2.5: Notifications */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              <span>إشعارات التذكير (Push Notifications)</span>
            </h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="space-y-1 text-right max-w-[70%]">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">تنبيهات الورد والمراجعة</span>
                <span className="block text-[10px] text-slate-500">تلقي تذكير يومي بموعد قراءتك ومراجعتك المجدولة.</span>
              </div>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  notificationsEnabled 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {notificationsEnabled ? <><Bell className="h-4 w-4"/> مفعلة</> : <><BellOff className="h-4 w-4"/> متوقفة</>}
              </button>
            </div>
          </div>

          {/* Section: Database Maintenance (Admins) */}
          {currentUser.isAdmin && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-500 flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" />
                <span>أدوات الصيانة (للمشرفين)</span>
              </h3>
              <p className="text-[10px] text-slate-400 -mt-2">تحديث بيانات الحلقات القديمة لتتوافق مع حدود آيات السور الصحيحة.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
                    const { db } = await import('../lib/firebase');
                    if (db) {
                      const logsRef = collection(db, 'auditLogs');
                      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(5));
                      const snapshot = await getDocs(q);
                      
                      if (snapshot.empty) {
                        alert('لا توجد سجلات صيانة سابقة.');
                      } else {
                        let logText = 'آخر 5 عمليات صيانة:\n\n';
                        snapshot.forEach(doc => {
                          const data = doc.data();
                          const date = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString('ar-EG') : 'غير معروف';
                          logText += `- التاريخ: ${date}\n  بواسطة: ${data.executorEmail}\n  الحالة: ${data.status}\n  النتيجة: ${data.details?.updatedCount || 0} حلقة محدثة\n\n`;
                        });
                        alert(logText);
                      }
                    }
                  } catch (err) {
                    alert('لا تملك صلاحية قراءة السجلات أو حدث خطأ.');
                  }
                }}
                className="w-full px-4 py-2 mb-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                عرض سجلات الصيانة السابقة
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const { getFunctions, httpsCallable } = await import('firebase/functions');
                    const { app } = await import('../lib/firebase');
                    const functions = getFunctions(app);
                    const migrateGroups = httpsCallable(functions, 'migrateGroupVerseRanges');
                    
                    alert('جاري التحديث عبر الخوادم...');
                    const result = await migrateGroups();
                    const data = result.data as any;
                    
                    if (data.success) {
                      alert(`تم التحديث بنجاح! عدد الحلقات التي تم تعديلها: ${data.updatedCount}`);
                    } else {
                      alert('حدث خطأ أثناء التحديث.');
                    }
                  } catch (e: any) {
                    alert('خطأ: ' + (e.message || 'تعذر تشغيل أداة الصيانة'));
                  }
                }}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                تشغيل تصحيح بيانات الحلقات
              </button>
            </div>
          )}

          {/* Section: Journey & Data Management */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              <span>إدارة الرحلة والبيانات</span>
            </h3>
            <p className="text-[10px] text-slate-400 -mt-2">يمكنك بدء رحلة جديدة داخل أثر آية مع بقاء حسابك كما هو.</p>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl space-y-3">
              <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">بدء رحلة جديدة</h4>
              <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-relaxed">سيتم تصفير التقدم، الخواطر، خطط الحفظ، المراجعات، الأوسمة، الإحصائيات، والمفضلة. سيبقى حسابك وبريدك الإلكتروني كما هما.</p>
              <button type="button" onClick={() => setIsResetModalOpen(true)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition w-full">بدء رحلة جديدة</button>
            </div>
          </div>

          {/* Section 3: Data Integrity Info */}
          <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
            <Info className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">🔒 سرية البيانات وسحابة التخزين الموحدة:</p>
              <p>يتم تخزين كافة خواطرك وتأملاتك، علامات القراءة الحالية، وخطط الحفظ بشكل مشفر وآمن بالكامل في قاعدة البيانات السحابية باسم حسابك الموحد. لا يمكن لأي مستخدم آخر الاطلاع على مذكرات تدبرك الخاصة.</p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              id="settings-save-btn"
            >
              {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>حفظ الإعدادات</span>
            </button>
          </div>

        </form>
      ) : (
        <div className="p-6 bg-slate-50 dark:bg-slate-950 text-slate-400 rounded-2xl text-center border border-dashed text-xs space-y-2">
          <p>الرجاء تسجيل الدخول لتتمكن من تعديل الإعدادات والتحكم بأهداف وردك الشخصي.</p>
        </div>
      )}

      {/* Reset Journey Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/30 text-amber-500 rounded-full"><AlertTriangle className="h-5 w-5"/></div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">هل تريدين بدء رحلة جديدة؟</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">سيتم حذف بيانات رحلتك الحالية داخل أثر آية، بما في ذلك الخواطر والتقدم وخطط الحفظ والمراجعة والأوسمة. لن يتم حذف حسابك أو بريدك الإلكتروني.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold">ملاحظة: لن يتم حذف حلقات التدبر. يمكنك حذفها أو مغادرتها من صفحة الحلقات.</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">للتأكيد، اكتبي "<span className="text-amber-600">بدء رحلة جديدة</span>" في الحقل أدناه:</label>
              <input type="text" value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"/>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-sm">إلغاء</button>
              <button 
                onClick={handleResetJourney} 
                disabled={isResetting || resetConfirmText !== "بدء رحلة جديدة"} 
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-400 text-white rounded-xl font-bold text-sm flex items-center gap-2"
              >
                {isResetting ? <Loader className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                {isResetting ? "جاري تصفير الرحلة..." : "تأكيد بدء رحلة جديدة"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
