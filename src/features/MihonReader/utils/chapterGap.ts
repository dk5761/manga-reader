import type { Chapter } from "@/sources";

/**
 * Calculate the gap (number of missing chapters) between two chapters.
 * Matches Mihon's calculateChapterGap() function.
 *
 * @param higher The chapter with higher number (can be curr when checking prev)
 * @param lower The chapter with lower number (can be prev when checking curr)
 * @returns Number of chapters between them, or 0 if sequential
 */
export function calculateChapterGap(
  higher: { chapter: Chapter } | null,
  lower: { chapter: Chapter } | null
): number {
  if (!higher || !lower) return 0;

  const higherNum = higher.chapter.number;
  const lowerNum = lower.chapter.number;

  // If numbers are sequential or lower is actually higher, no gap
  if (higherNum <= lowerNum + 1) return 0;

  // Gap is the difference minus 1 (since sequential chapters have diff of 1)
  return Math.floor(higherNum - lowerNum - 1);
}
