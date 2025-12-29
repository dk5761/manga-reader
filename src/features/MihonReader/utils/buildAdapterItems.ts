import type { ViewerChapters, AdapterItem } from "../models";
import {
  createPrevTransition,
  createNextTransition,
  getChapterPages,
} from "../models";

/**
 * Build the flat list of adapter items for the virtualized list.
 *
 * The list structure:
 * 1. Prev transition (chapter start divider)
 * 2. All current chapter pages
 * 3. Next transition (chapter end divider)
 * 4. First few pages of next chapter (for seamless scroll into next)
 *
 * When user scrolls into the next chapter's pages, the container should
 * detect this and call setViewerChapters to make next the new current.
 *
 * @param viewerChapters The three-chapter window
 * @returns Flat array of items to render
 */
export function buildAdapterItems(
  viewerChapters: ViewerChapters
): AdapterItem[] {
  const { prev, curr, next } = viewerChapters;
  const items: AdapterItem[] = [];

  // === 1. Prev transition (chapter start divider) ===
  // Always show so user knows they're at the start of a chapter
  items.push(createPrevTransition(curr, prev));

  // === 2. All current chapter pages ===
  const currPages = getChapterPages(curr);
  if (currPages && currPages.length > 0) {
    items.push(...currPages);
  }

  // === 3. Next transition (chapter end divider) ===
  // Always show so user knows they're at the end of a chapter
  items.push(createNextTransition(curr, next));

  // === 4. Next chapter pages (for seamless forward scroll) ===
  // Add ALL pages of next chapter when loaded, so user can scroll into them
  // The chapter change will be detected and viewerChapters will update
  if (next) {
    const nextPages = getChapterPages(next);
    if (nextPages && nextPages.length > 0) {
      items.push(...nextPages);
    }
  }

  return items;
}

/**
 * Find the scroll index to start at for the current chapter.
 * This accounts for the prev transition at the start.
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
 * Get the chapter ID for an item.
 */
export function getItemChapterId(item: AdapterItem): string {
  if (item.type === "page") {
    return item.chapterId;
  }
  return item.from.chapter.id;
}
