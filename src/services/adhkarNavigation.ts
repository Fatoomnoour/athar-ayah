import { ADHKAR_LIST, AdhkarCategory, AdhkarItem } from "../data/adhkar";

export type NavigationAction = "previous" | "next";
export type TextDirection = "rtl" | "ltr";

/** Return only the canonical, read-only items belonging to one category. */
export function getCategoryItems(
  category: AdhkarCategory,
  items: readonly AdhkarItem[] = ADHKAR_LIST,
): AdhkarItem[] {
  return items.filter((item) => item.category === category);
}

/** Move forward without leaving the current category or exceeding its last item. */
export function getNextIndex(currentIndex: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return Math.max(0, Math.min(currentIndex + 1, itemCount - 1));
}

/** Move backward without leaving the current category or going below its first item. */
export function getPreviousIndex(currentIndex: number, itemCount: number): number {
  if (itemCount <= 0) return 0;
  return Math.max(0, Math.min(currentIndex - 1, itemCount - 1));
}

/**
 * Return the visual chevron direction for a semantic action.
 * In RTL, the previous action points right and the next action points left.
 */
export function getNavigationIcon(
  direction: TextDirection,
  action: NavigationAction,
): "left" | "right" {
  if (direction === "rtl") {
    return action === "previous" ? "right" : "left";
  }
  return action === "previous" ? "left" : "right";
}
