import { PrayerTimesData, PrayerTimeSettings } from "../data/prayerTimes";

const API_BASE_URL = "https://api.aladhan.com/v1";

/**
 * Fetch prayer times for a specific city and country
 */
export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method: number
): Promise<PrayerTimesData | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/timingsByCity?city=${encodeURIComponent(
        city
      )}&country=${encodeURIComponent(country)}&method=${method}`
    );

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const json = await response.json();

    if (json.code !== 200 || !json.data) {
      throw new Error("Invalid data received from API");
    }

    const { timings, date, meta } = json.data;

    return {
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
      date: {
        gregorian: date.gregorian.date,
        hijri: `${date.hijri.day} ${date.hijri.month.ar} ${date.hijri.year}`,
        timestamp: Number(date.timestamp) * 1000,
      },
      location: {
        city,
        country,
        latitude: meta.latitude,
        longitude: meta.longitude,
      },
      meta: {
        methodId: meta.method.id,
        methodName: meta.method.name,
        lastUpdated: Date.now(),
      },
    };
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    return null;
  }
}

/**
 * Parse time string "HH:MM" to Date object for today
 */
export function parseTimeString(timeStr: string): Date {
  // Handle formats like "14:30 (EET)"
  const cleanTime = timeStr.split(" ")[0];
  const [hours, minutes] = cleanTime.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Get the next prayer and time remaining
 */
export function getNextPrayer(prayerTimes: PrayerTimesData) {
  const now = new Date();

  const prayers = [
    { id: "fajr", nameAr: "الفجر", nameEn: "Fajr", time: parseTimeString(prayerTimes.fajr) },
    { id: "sunrise", nameAr: "الشروق", nameEn: "Sunrise", time: parseTimeString(prayerTimes.sunrise) },
    { id: "dhuhr", nameAr: "الظهر", nameEn: "Dhuhr", time: parseTimeString(prayerTimes.dhuhr) },
    { id: "asr", nameAr: "العصر", nameEn: "Asr", time: parseTimeString(prayerTimes.asr) },
    { id: "maghrib", nameAr: "المغرب", nameEn: "Maghrib", time: parseTimeString(prayerTimes.maghrib) },
    { id: "isha", nameAr: "العشاء", nameEn: "Isha", time: parseTimeString(prayerTimes.isha) },
  ];

  // Find the first prayer that is in the future
  for (const prayer of prayers) {
    if (prayer.time > now) {
      return {
        ...prayer,
        diffMs: prayer.time.getTime() - now.getTime()
      };
    }
  }

  // If all prayers today have passed, the next is Fajr tomorrow
  const tomorrowFajr = new Date(prayers[0].time);
  tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);

  return {
    ...prayers[0],
    time: tomorrowFajr,
    diffMs: tomorrowFajr.getTime() - now.getTime()
  };
}

/**
 * Format milliseconds into HH:MM:SS string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms < 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
