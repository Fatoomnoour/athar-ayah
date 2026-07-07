import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { getApps } from "firebase/app";

let analytics: any = null;

export const initAnalytics = async () => {
  const apps = getApps();
  if (apps.length > 0) {
    try {
      const supported = await isSupported();
      if (supported) {
        analytics = getAnalytics(apps[0]);
      }
    } catch (err) {
      console.warn("Analytics not supported", err);
    }
  }
};

export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

export const trackAppOpen = () => trackEvent("app_open");
export const trackLogin = (method: string) => trackEvent("login", { method });
export const trackSurahOpen = (surahId: number, surahName: string) => trackEvent("surah_open", { surahId, surahName });
export const trackAyahRead = (surahId: number, verseNumber: number) => trackEvent("ayah_read", { surahId, verseNumber });
export const trackAudioPlay = (surahId: number, verseNumber: number, reciter: string) => trackEvent("audio_play", { surahId, verseNumber, reciter });
export const trackBookmarkAdded = (surahId: number, verseNumber: number) => trackEvent("bookmark_added", { surahId, verseNumber });
export const trackReflectionCreated = (surahId: number, verseNumber: number) => trackEvent("reflection_created", { surahId, verseNumber });
export const trackMemorizationPlanCreated = (surahId: number) => trackEvent("memorization_plan_created", { surahId });
export const trackGroupJoined = (groupId: string) => trackEvent("group_joined", { groupId });
export const trackSearch = (query: string) => trackEvent("search", { search_term: query });
export const trackDarkModeToggle = (theme: string) => trackEvent("dark_mode_toggle", { theme });
export const trackNotificationEnabled = () => trackEvent("notification_enabled");
export const trackInstallPWA = () => trackEvent("install_pwa");
export const trackOfflineUsage = () => trackEvent("offline_usage");

// Setup simple crash/error logging
export const logError = (error: Error, contextInfo?: any) => {
  console.error("[App Error]", error, contextInfo);
  trackEvent("exception", {
    description: error.message || String(error),
    fatal: false,
    ...contextInfo
  });
};
