import { describe, it, expect } from "vitest";
import { ADHKAR_LIST } from "../../data/adhkar";
import { parseTimeString, getNextPrayer, formatTimeRemaining } from "../prayerTimesService";

describe("Islamic Modules Tests", () => {
  describe("Adhkar Data Integrity", () => {
    it("should have valid curated adhkar items", () => {
      expect(ADHKAR_LIST.length).toBeGreaterThan(0);

      ADHKAR_LIST.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.arabicText.length).toBeGreaterThan(10);
        expect(item.englishMeaning.length).toBeGreaterThan(10);
        expect(item.repeatCount).toBeGreaterThanOrEqual(1);
        expect(item.sourceType).toMatch(/^(quran|hadith)$/);
        expect(item.sourceTitle).toBeDefined();
        expect(item.reference).toBeDefined();
      });
    });

    it("should not contain duplicate IDs", () => {
      const ids = ADHKAR_LIST.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe("Prayer Times Service", () => {
    it("should parse time string correctly", () => {
      const time = parseTimeString("14:30 (EET)");
      expect(time.getHours()).toBe(14);
      expect(time.getMinutes()).toBe(30);
    });

    it("should format time remaining correctly", () => {
      expect(formatTimeRemaining(0)).toBe("00:00:00");
      expect(formatTimeRemaining(1000)).toBe("00:00:01");
      expect(formatTimeRemaining(60000)).toBe("00:01:00");
      expect(formatTimeRemaining(3600000)).toBe("01:00:00");
      expect(formatTimeRemaining(3661000)).toBe("01:01:01");
      expect(formatTimeRemaining(-1000)).toBe("00:00:00");
    });
  });
});
