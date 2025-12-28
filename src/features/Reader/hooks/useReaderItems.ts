/**
 * useReaderItems Hook
 * Builds the unified items array from loaded chapters.
 * Like Mihon, includes prev chapter last pages + transitions + current + next pages.
 */

import { useMemo } from "react";
import {
  useInfiniteReaderStore,
  selectLoadedChapters,
  selectChapters,
  selectCurrentChapterIndex,
  selectHasMorePrev,
  selectHasMoreNext,
} from "../store/useInfiniteReaderStore";
import {
  createPageItem,
  createTransitionItem,
  READER_CONFIG,
  type ReaderItem,
  type LoadedChapter,
} from "../types/infinite-reader.types";
import { readerLog, createPerfLogger } from "../utils/reader-logger";
import type { Chapter } from "@/sources";

/**
 * Builds the unified items array for the infinite reader.
 * Returns a stable array that only changes when loaded chapters change.
 */
export function useReaderItems(): ReaderItem[] {
  const loadedChapters = useInfiniteReaderStore(selectLoadedChapters);
  const chapters = useInfiniteReaderStore(selectChapters);
  const currentChapterIndex = useInfiniteReaderStore(selectCurrentChapterIndex);
  const hasMorePrev = useInfiniteReaderStore(selectHasMorePrev);
  const hasMoreNext = useInfiniteReaderStore(selectHasMoreNext);

  // Get loading states for transitions
  const chapterStates = useInfiniteReaderStore((s) => s.chapterStates);
  const chapterErrors = useInfiniteReaderStore((s) => s.chapterErrors);

  return useMemo(() => {
    const perf = createPerfLogger("buildReaderItems");

    if (chapters.length === 0 || loadedChapters.size === 0) {
      readerLog.items.warn("No chapters or loaded chapters");
      return [];
    }

    const items: ReaderItem[] = [];

    // Sort loaded chapters by index (descending - higher index = earlier chapter)
    const sortedChapterIds = Array.from(loadedChapters.keys()).sort((a, b) => {
      const aIdx = chapters.findIndex((c) => c.id === a);
      const bIdx = chapters.findIndex((c) => c.id === b);
      return bIdx - aIdx; // Higher index first (prev chapters first)
    });

    // Get current chapter info
    const currentChapterId =
      sortedChapterIds.find(
        (id) => chapters.findIndex((c) => c.id === id) === currentChapterIndex
      ) ?? sortedChapterIds[0];

    const currentChapter = chapters[currentChapterIndex];

    // =========================================================================
    // 1. Add PREV transition at the very start
    // =========================================================================
    if (hasMorePrev) {
      const prevChapter = chapters[currentChapterIndex + 1];
      const prevState = chapterStates.get(prevChapter?.id ?? "");
      const prevError = chapterErrors.get(prevChapter?.id ?? "");

      items.push(
        createTransitionItem("prev", currentChapter, prevChapter ?? null, {
          isLoading: prevState === "loading",
          error: prevError,
        })
      );
    } else {
      // First chapter - show "beginning" message
      items.push(
        createTransitionItem("prev", currentChapter, null, {
          isLoading: false,
        })
      );
    }

    // =========================================================================
    // 2. Add pages from all loaded chapters (sorted by chapter order)
    // =========================================================================
    for (const chapterId of sortedChapterIds) {
      const loaded = loadedChapters.get(chapterId);
      if (!loaded) continue;

      const chapterIndex = chapters.findIndex((c) => c.id === chapterId);

      // Add all pages from this chapter
      for (const page of loaded.pages) {
        items.push(createPageItem(page, chapterId, chapterIndex));
      }
    }

    // =========================================================================
    // 3. Add NEXT transition at the very end
    // =========================================================================
    if (hasMoreNext) {
      const nextChapter = chapters[currentChapterIndex - 1];
      const nextState = chapterStates.get(nextChapter?.id ?? "");
      const nextError = chapterErrors.get(nextChapter?.id ?? "");

      items.push(
        createTransitionItem("next", currentChapter, nextChapter ?? null, {
          isLoading: nextState === "loading",
          error: nextError,
        })
      );
    } else {
      // Last chapter - show "caught up" message
      items.push(
        createTransitionItem("next", currentChapter, null, {
          isLoading: false,
        })
      );
    }

    readerLog.items.debug("Built items", {
      total: items.length,
      pages: items.filter((i) => i.type === "page").length,
      transitions: items.filter((i) => i.type === "transition").length,
      loadedChapters: sortedChapterIds,
    });

    perf.end({ itemCount: items.length });

    return items;
  }, [
    loadedChapters,
    chapters,
    currentChapterIndex,
    hasMorePrev,
    hasMoreNext,
    chapterStates,
    chapterErrors,
  ]);
}

/**
 * Find the initial scroll index (skip prev transition)
 */
export function useInitialScrollIndex(items: ReaderItem[]): number {
  return useMemo(() => {
    // First item is always prev transition, so start at index 1
    const firstPageIndex = items.findIndex((item) => item.type === "page");
    return firstPageIndex >= 0 ? firstPageIndex : 0;
  }, [items]);
}

/**
 * Get page count for current chapter
 */
export function useCurrentChapterPageCount(): number {
  const loadedChapters = useInfiniteReaderStore(selectLoadedChapters);
  const currentChapterId = useInfiniteReaderStore((s) => s.currentChapterId);

  return useMemo(() => {
    const loaded = loadedChapters.get(currentChapterId);
    return loaded?.pages.length ?? 0;
  }, [loadedChapters, currentChapterId]);
}
