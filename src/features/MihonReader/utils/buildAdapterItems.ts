import type {
  ViewerChapters,
  AdapterItem,
  ReaderChapter,
  ReaderPage,
} from "../models";
import {
  createPrevTransition,
  createNextTransition,
  getChapterPages,
} from "../models";
import { calculateChapterGap } from "./chapterGap";

/**
 * Build the flat list of adapter items for the virtualized list.
 * Matches Mihon's WebtoonAdapter.setChapters() logic.
 *
 * The list structure:
 * 1. Last 2 pages of prev chapter (for smooth scroll back)
 * 2. Prev transition (if needed)
 * 3. All current chapter pages
 * 4. Next transition (if needed)
 * 5. First 2 pages of next chapter (for smooth scroll forward)
 *
 * @param viewerChapters The three-chapter window
 * @param forceTransition Always show transitions (e.g., when on a transition)
 * @returns Flat array of items to render
 */
export function buildAdapterItems(
  viewerChapters: ViewerChapters,
  forceTransition = false
): AdapterItem[] {
  const { prev, curr, next } = viewerChapters;
  const items: AdapterItem[] = [];

  // === 1. Last 2 pages of prev chapter ===
  if (prev) {
    const prevPages = getChapterPages(prev);
    if (prevPages && prevPages.length > 0) {
      // Take last 2 pages for seamless backward scroll
      items.push(...prevPages.slice(-2));
    }
  }

  // === 2. Prev transition ===
  const prevGap = calculateChapterGap(curr, prev);
  const showPrevTransition =
    prevGap > 0 || // Missing chapters between
    forceTransition || // Forced display
    !prev || // No previous chapter
    prev.state.status !== "loaded"; // Prev not loaded yet

  if (showPrevTransition) {
    items.push(createPrevTransition(curr, prev));
  }

  // === 3. All current chapter pages ===
  const currPages = getChapterPages(curr);
  if (currPages && currPages.length > 0) {
    items.push(...currPages);
  }

  // === 4. Next transition ===
  const nextGap = calculateChapterGap(next, curr);
  const showNextTransition =
    nextGap > 0 || // Missing chapters between
    forceTransition || // Forced display
    !next || // No next chapter
    next.state.status !== "loaded"; // Next not loaded yet

  if (showNextTransition) {
    items.push(createNextTransition(curr, next));
  }

  // === 5. First 2 pages of next chapter ===
  if (next) {
    const nextPages = getChapterPages(next);
    if (nextPages && nextPages.length > 0) {
      // Take first 2 pages for seamless forward scroll
      items.push(...nextPages.slice(0, 2));
    }
  }

  return items;
}

/**
 * Find the scroll index to start at for the current chapter.
 * This accounts for any prev chapter pages and the prev transition.
 *
 * @param items The adapter items array
 * @param currChapterId The current chapter's ID
 * @param requestedPage 0-indexed page to start at within current chapter
 * @returns Index in the items array to scroll to
 */
export function findInitialScrollIndex(
  items: AdapterItem[],
  currChapterId: string,
  requestedPage = 0
): number {
  // Find the first page of the current chapter
  let currChapterStartIndex = -1;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === "page" && item.chapterId === currChapterId) {
      if (currChapterStartIndex === -1) {
        currChapterStartIndex = i;
      }
      // Check if this is the requested page
      if (item.index === requestedPage) {
        return i;
      }
    }
  }

  // Fallback to start of current chapter, or start of list
  return currChapterStartIndex >= 0 ? currChapterStartIndex : 0;
}

/**
 * Get unique key for an adapter item (for FlashList/FlatList).
 */
export function getItemKey(item: AdapterItem, index: number): string {
  if (item.type === "page") {
    return `page-${item.chapterId}-${item.index}`;
  }
  // Transition key includes direction and chapter IDs
  const fromId = item.from.chapter.id;
  const toId = item.to?.chapter.id ?? "none";
  return `transition-${item.direction}-${fromId}-${toId}`;
}

/**
 * Find which chapter a given item belongs to.
 * For pages, it's the page's chapter.
 * For transitions, it's the 'from' chapter (current chapter context).
 */
export function getItemChapter(item: AdapterItem): ReaderChapter {
  if (item.type === "page") {
    // We need to look up the chapter - for now return from context
    // This will be handled by the component that has access to viewerChapters
    throw new Error("Use getItemChapterId instead");
  }
  return item.from;
}

/**
 * Get the chapter ID for an item.
 */
export function getItemChapterId(item: AdapterItem): string {
  if (item.type === "page") {
    return item.chapterId;
  }
  return item.from.chapter.id;
}
