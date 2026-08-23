import React, { useState, useEffect } from "react";
import { useLanguage } from "../i18n";
import { User } from "../types";
import { PrayerTimesData, PrayerTimeSettings, DEFAULT_PRAYER_SETTINGS, CALCULATION_METHODS } from "../data/prayerTimes";
import { fetchPrayerTimesByCity, getNextPrayer, formatTimeRemaining } from "../services/prayerTimesService";
import { Clock, MapPin, Bell, Settings, RefreshCw, AlertTriangle, Check } from "lucide-react";

interface PrayerTimesPageProps {
  currentUser: User | null;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function PrayerTimesPage({ currentUser, onShowToast }: PrayerTimesPageProps) {
  const { language, direction, t } = useLanguage();

  const [settings, setSettings] = useState<PrayerTimeSettings>(() => {
    const saved = localStorage.getItem("athar_prayer_settings");
    return saved ? JSON.parse(saved) : DEFAULT_PRAYER_SETTINGS;
  });

  const [data, setData] = useState<PrayerTimesData | null>(() => {
    const saved = localStorage.getItem("athar_prayer_data");
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("00:00:00");
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [nextPrayerId, setNextPrayerId] = useState<string>("");

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem("athar_prayer_settings", JSON.stringify(settings));
  }, [settings]);

  // Save data when fetched
  useEffect(() => {
    if (data) {
      localStorage.setItem("athar_prayer_data", JSON.stringify(data));
    }
  }, [data]);

  // Fetch data
  const loadPrayerTimes = async (forceRefresh = false) => {
    // Check if we need to refresh (data is older than 12 hours or different city/method)
    const needsRefresh = forceRefresh || !data ||
      (Date.now() - data.meta.lastUpdated > 12 * 60 * 60 * 1000) ||
      data.location.city.toLowerCase() !== settings.city.toLowerCase() ||
      data.meta.methodId !== settings.method;

    if (!needsRefresh) return;

    setIsLoading(true);
    setError(null);

    try {
      const newData = await fetchPrayerTimesByCity(settings.city, settings.country, settings.method);

      if (newData) {
        setData(newData);
        if (forceRefresh) {
          onShowToast(language === 'ar' ? "تم تحديث المواقيت بنجاح" : "Prayer times updated successfully", "success");
        }
      } else {
        setError(language === 'ar' ? "تعذر جلب المواقيت. يرجى التحقق من اسم المدينة والاتصال بالإنترنت." : "Could not fetch prayer times. Please check city name and internet connection.");
        if (!data) {
          // If we have no cached data, show error toast
          onShowToast(language === 'ar' ? "تعذر جلب المواقيت" : "Failed to fetch prayer times", "error");
        }
      }
    } catch (err) {
      setError(language === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred while connecting to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadPrayerTimes();
  }, [settings.city, settings.country, settings.method]);

  // Update countdown timer
  useEffect(() => {
    if (!data) return;

    const updateTimer = () => {
      const next = getNextPrayer(data);
      setTimeRemaining(formatTimeRemaining(next.diffMs));
      setNextPrayerName(language === 'ar' ? next.nameAr : next.nameEn);
      setNextPrayerId(next.id);

      // If a prayer just started, we might want to trigger a notification here in a full implementation
      // For now, we just reload data if it's a new day
      if (next.id === "fajr" && next.diffMs > 23 * 60 * 60 * 1000) {
        // It's Fajr tomorrow, we should probably refresh data soon to get tomorrow's exact times
        if (Date.now() - data.meta.lastUpdated > 2 * 60 * 60 * 1000) {
          loadPrayerTimes(true);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data, language]);

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const method = Number(formData.get("method"));

    if (city.trim() && country.trim()) {
      setSettings(prev => ({
        ...prev,
        city: city.trim(),
        country: country.trim(),
        method
      }));
      setShowSettings(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      // Request permission
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setSettings(prev => ({ ...prev, notificationsEnabled: true }));
          onShowToast(language === 'ar' ? "تم تفعيل تنبيهات الصلاة" : "Prayer alerts enabled", "success");
        } else {
          onShowToast(language === 'ar' ? "تم رفض صلاحية الإشعارات" : "Notification permission denied", "error");
        }
      } else {
        onShowToast(language === 'ar' ? "متصفحك لا يدعم الإشعارات" : "Your browser does not support notifications", "error");
      }
    } else {
      setSettings(prev => ({ ...prev, notificationsEnabled: false }));
    }
  };

  const cleanTime = (timeStr: string) => {
    // Remove timezone info like " (EET)"
    return timeStr.split(" ")[0];
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20" dir={direction}>

      {/* Header & Settings Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">{t("prayerTimes")}</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl transition-colors ${showSettings ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"}`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-4">
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{language === 'ar' ? "المدينة (بالإنجليزية أو العربية)" : "City"}</label>
                <input
                  name="city"
                  defaultValue={settings.city}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Cairo"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">{language === 'ar' ? "الدولة (بالإنجليزية أو العربية)" : "Country"}</label>
                <input
                  name="country"
                  defaultValue={settings.country}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Egypt"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">{t("calculationMethod")}</label>
              <select
                name="method"
                defaultValue={settings.method}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CALCULATION_METHODS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2">
                <Check className="w-4 h-4" />
                {language === 'ar' ? "حفظ وتحديث" : "Save & Update"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content */}
      {data ? (
        <div className="space-y-6">
          {/* Next Prayer Hero Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
              <Clock className="w-48 h-48" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-start space-y-2">
                <p className="text-emerald-300/80 text-sm font-bold tracking-wider uppercase">{t("nextPrayer")}</p>
                <h3 className="text-4xl md:text-5xl font-black">{nextPrayerName}</h3>
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-emerald-100/70 text-xs mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{data.location.city}, {data.location.country}</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-center min-w-[160px]">
                <p className="text-emerald-100/70 text-[10px] font-bold tracking-wider uppercase mb-1">{t("timeRemaining")}</p>
                <p className="text-3xl font-black tabular-nums tracking-tight">{timeRemaining}</p>
              </div>
            </div>
          </div>

          {/* Error / Offline Warning */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-900/50">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                <p className="text-[10px] opacity-80 mt-1">{language === 'ar' ? "يتم عرض آخر بيانات محفوظة." : "Showing last saved data."}</p>
              </div>
            </div>
          )}

          {/* Date & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-2">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{data.date.hijri}</p>
              <p className="text-xs text-slate-500">{data.date.gregorian}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleToggleNotifications}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  settings.notificationsEnabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("enableAlerts")}</span>
              </button>

              <button
                onClick={() => loadPrayerTimes(true)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{t("updateTimes")}</span>
              </button>
            </div>
          </div>

          {/* Prayer Times Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[
              { id: "fajr", nameAr: "الفجر", nameEn: "Fajr", time: data.fajr },
              { id: "sunrise", nameAr: "الشروق", nameEn: "Sunrise", time: data.sunrise },
              { id: "dhuhr", nameAr: "الظهر", nameEn: "Dhuhr", time: data.dhuhr },
              { id: "asr", nameAr: "العصر", nameEn: "Asr", time: data.asr },
              { id: "maghrib", nameAr: "المغرب", nameEn: "Maghrib", time: data.maghrib },
              { id: "isha", nameAr: "العشاء", nameEn: "Isha", time: data.isha },
            ].map((prayer) => {
              const isNext = nextPrayerId === prayer.id;
              return (
                <div
                  key={prayer.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isNext
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 shadow-sm transform scale-[1.02]"
                      : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                  }`}
                >
                  <p className={`text-sm font-bold mb-2 ${isNext ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {language === 'ar' ? prayer.nameAr : prayer.nameEn}
                  </p>
                  <p className={`text-2xl font-black tabular-nums ${isNext ? "text-emerald-800 dark:text-emerald-300" : "text-slate-800 dark:text-slate-100"}`}>
                    {cleanTime(prayer.time)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <p className="text-[10px] text-slate-400">
              {t("calculationMethod")}: {data.meta.methodName}
            </p>
          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm text-slate-500">{language === 'ar' ? "لم يتم إعداد المدينة بعد أو تعذر جلب البيانات." : "City not set or data could not be fetched."}</p>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl mt-2"
              >
                {t("changeCity")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
