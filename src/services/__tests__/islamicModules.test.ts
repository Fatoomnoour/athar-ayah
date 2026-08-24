import { describe, it, expect } from "vitest";
import { ADHKAR_CATEGORY_MINIMUM, ADHKAR_LIST, AdhkarCategory } from "../../data/adhkar";
import { getCategoryItems, getNavigationIcon, getNextIndex, getPreviousIndex } from "../adhkarNavigation";
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

    it("should cover every category with multiple items", () => {
      const categories: AdhkarCategory[] = [
        "morning",
        "evening",
        "post_prayer",
        "sleep",
        "waking",
        "home",
        "travel",
        "forgiveness",
        "ruqyah",
        "quranic",
      ];

      categories.forEach((category) => {
        const items = ADHKAR_LIST.filter((item) => item.category === category);
        expect(items.length, `${category} should contain a complete set`).toBeGreaterThanOrEqual(ADHKAR_CATEGORY_MINIMUM);
      });
    });

    it("should keep canonical text complete and sourced", () => {
      ADHKAR_LIST.forEach((item) => {
        expect(item.arabicText).not.toContain("...");
        expect(item.sourceUrl).toMatch(/^https:\/\//);
      });
    });

    it("should not contain duplicate IDs", () => {
      const ids = ADHKAR_LIST.map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should navigate through every category without crossing its boundaries", () => {
      const categories: AdhkarCategory[] = [
        "morning",
        "evening",
        "post_prayer",
        "sleep",
        "waking",
        "home",
        "travel",
        "forgiveness",
        "ruqyah",
        "quranic",
      ];

      categories.forEach((category) => {
        const items = getCategoryItems(category);
        const visited = [0];

        for (let index = 0; index < items.length - 1; index += 1) {
          visited.push(getNextIndex(visited[visited.length - 1], items.length));
        }

        expect(visited).toEqual(items.map((_, index) => index));
        expect(getNextIndex(items.length - 1, items.length)).toBe(items.length - 1);
        expect(getPreviousIndex(0, items.length)).toBe(0);
        expect(getNextIndex(999, items.length)).toBe(items.length - 1);
        expect(getPreviousIndex(-999, items.length)).toBe(0);
      });
    });

    it("should navigate back through every category without crossing its boundaries", () => {
      const categories: AdhkarCategory[] = [
        "morning",
        "evening",
        "post_prayer",
        "sleep",
        "waking",
        "home",
        "travel",
        "forgiveness",
        "ruqyah",
        "quranic",
      ];

      categories.forEach((category) => {
        const items = getCategoryItems(category);
        const visited = [items.length - 1];

        for (let index = items.length - 1; index > 0; index -= 1) {
          visited.push(getPreviousIndex(visited[visited.length - 1], items.length));
        }

        expect(visited).toEqual(items.map((_, index) => items.length - 1 - index));
      });
    });

    it("should keep semantic arrow direction correct in RTL and LTR", () => {
      expect(getNavigationIcon("rtl", "previous")).toBe("right");
      expect(getNavigationIcon("rtl", "next")).toBe("left");
      expect(getNavigationIcon("ltr", "previous")).toBe("left");
      expect(getNavigationIcon("ltr", "next")).toBe("right");
    });

    it("should make repeated boundary navigation safe for every category", () => {
      const categories: AdhkarCategory[] = [
        "morning",
        "evening",
        "post_prayer",
        "sleep",
        "waking",
        "home",
        "travel",
        "forgiveness",
        "ruqyah",
        "quranic",
      ];

      categories.forEach((category) => {
        const itemCount = getCategoryItems(category).length;
        let nextIndex = 0;
        let previousIndex = itemCount - 1;

        for (let attempt = 0; attempt < 1000; attempt += 1) {
          nextIndex = getNextIndex(nextIndex, itemCount);
          previousIndex = getPreviousIndex(previousIndex, itemCount);
        }

        expect(nextIndex).toBe(itemCount - 1);
        expect(previousIndex).toBe(0);
      });
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
