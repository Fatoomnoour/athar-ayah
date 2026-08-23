export interface PrayerTimesData {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: {
    gregorian: string;
    hijri: string;
    timestamp: number;
  };
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  meta: {
    methodId: number;
    methodName: string;
    lastUpdated: number;
  };
}

export interface PrayerTimeSettings {
  city: string;
  country: string;
  method: number;
  notificationsEnabled: boolean;
  alertMinutesBefore: number;
  soundEnabled: boolean;
}

export const DEFAULT_PRAYER_SETTINGS: PrayerTimeSettings = {
  city: "Cairo",
  country: "Egypt",
  method: 5, // Egyptian General Authority of Survey
  notificationsEnabled: false,
  alertMinutesBefore: 10,
  soundEnabled: true,
};

export const CALCULATION_METHODS = [
  { id: 2, name: "Islamic Society of North America (ISNA)" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 8, name: "Gulf Region" },
  { id: 9, name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Majlis Ugama Islam Singapura, Singapore" },
  { id: 12, name: "Union Organization islamic de France" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia" },
];
