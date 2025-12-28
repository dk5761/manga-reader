/**
 * useVisibleChapterTracker Hook
 * Detects when the user scrolls into a new chapter and updates store.
 */

import { useEffect, useRef, useCallback } from "react";
import {
  useInfiniteReaderStore,
  selectCurrentChapterId,
  selectChapters,
} from "../store/useInfiniteReaderStore";
import { readerLog } from "../utils/reader-logger";
import type { ReaderItem, PageItem } from "../types/infinite-reader.types";

interface UseVisibleChapterTrackerOptions {
  items: ReaderItem[];
  enabled?: boolean;
}

/**
 * Tracks which chapter is currently visible in the viewport.
 * Updates store when chapter changes.
 */
export function useVisibleChapterTracker({
  items,
  enabled = true,
}: UseVisibleChapterTrackerOptions) {
  const currentChapterId = useInfiniteReaderStore(selectCurrentChapterId);
  const chapters = useInfiniteReaderStore(selectChapters);
  const setCurrentChapter = useInfiniteReaderStore((s) => s.setCurrentChapter);
  const setCurrentPage = useInfiniteReaderStore((s) => s.setCurrentPage);
  const markChapterAsRead = useInfiniteReaderStore((s) => s.markChapterAsRead);

  // Track previous chapter for transition detection
  const prevChapterIdRef = useRef(currentChapterId);

  /**
   * Called when a page becomes visible.
   * Updates current chapter/page in store.
   */
  const onPageVisible = useCallback(
    (pageItem: PageItem, pageNumberInChapter: number) => {
      if (!enabled) return;

      const { chapterId, chapterIndex } = pageItem;

      // Update page number
      setCurrentPage(pageNumberInChapter);

      // Check if chapter changed
      if (chapterId !== currentChapterId) {
        readerLog.chapter.info("Chapter transition detected", {
          from: currentChapterId,
          to: chapterId,
          newChapterIndex: chapterIndex,
        });

        // Mark previous chapter as read when scrolling away
        if (
          prevChapterIdRef.current &&
          prevChapterIdRef.current !== chapterId
        ) {
          readerLog.mark.info("Auto-marking previous chapter as read", {
            chapterId: prevChapterIdRef.current,
          });
          markChapterAsRead(prevChapterIdRef.current);
        }

        // Update current chapter
        setCurrentChapter(chapterId, chapterIndex);
        prevChapterIdRef.current = chapterId;
      }
    },
    [
      enabled,
      currentChapterId,
      setCurrentChapter,
      setCurrentPage,
      markChapterAsRead,
    ]
  );

  /**
   * Get page item at a specific index in the items array.
   * Returns the page info needed for visibility tracking.
   */
  const getPageAtIndex = useCallback(
    (index: number): { pageItem: PageItem; pageNumber: number } | null => {
      const item = items[index];
      if (!item || item.type !== "page") {
        return null;
      }

      // Calculate which page number this is within its chapter
      // Count pages with same chapterId before this one
      let pageNumber = 1;
      for (let i = 0; i < index; i++) {
        const prevItem = items[i];
        if (prevItem.type === "page" && prevItem.chapterId === item.chapterId) {
          pageNumber++;
        }
      }

      return { pageItem: item, pageNumber };
    },
    [items]
  );

  /**
   * Process scroll position to determine visible page.
   */
  const processVisibleIndex = useCallback(
    (visibleIndex: number) => {
      const pageInfo = getPageAtIndex(visibleIndex);
      if (pageInfo) {
        onPageVisible(pageInfo.pageItem, pageInfo.pageNumber);
      }
    },
    [getPageAtIndex, onPageVisible]
  );

  return {
    onPageVisible,
    getPageAtIndex,
    processVisibleIndex,
  };
}

/**
 * Calculate page number within a chapter from global items index.
 */
export function calculatePageNumber(
  items: ReaderItem[],
  globalIndex: number
): {
  pageNumber: number;
  totalPagesInChapter: number;
  chapterId: string;
} | null {
  const item = items[globalIndex];
  if (!item || item.type !== "page") {
    return null;
  }

  const chapterId = item.chapterId;
  let pageNumber = 0;
  let totalPagesInChapter = 0;

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    if (current.type === "page" && current.chapterId === chapterId) {
      totalPagesInChapter++;
      if (i <= globalIndex) {
        pageNumber++;
      }
    }
  }

  return { pageNumber, totalPagesInChapter, chapterId };
}
