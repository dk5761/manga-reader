/**
 * useChapterPrefetch Hook
 * Automatically prefetches adjacent chapters when user is near boundaries.
 */

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useInfiniteReaderStore,
  selectCurrentPage,
  selectCurrentChapterIndex,
  selectChapters,
  selectHasMorePrev,
  selectHasMoreNext,
} from "../store/useInfiniteReaderStore";
import { READER_CONFIG } from "../types/infinite-reader.types";
import { readerLog } from "../utils/reader-logger";
import { useChapterPages } from "../api/reader.queries";
import type { Chapter, Page } from "@/sources";

interface UsePrefetchOptions {
  sourceId: string;
  enabled?: boolean;
}

/**
 * Hook that triggers prefetch when within threshold of chapter boundaries.
 * Watches currentPage and triggers loading of adjacent chapters.
 */
export function useChapterPrefetch({
  sourceId,
  enabled = true,
}: UsePrefetchOptions) {
  const currentPage = useInfiniteReaderStore(selectCurrentPage);
  const currentChapterIndex = useInfiniteReaderStore(selectCurrentChapterIndex);
  const chapters = useInfiniteReaderStore(selectChapters);
  const hasMorePrev = useInfiniteReaderStore(selectHasMorePrev);
  const hasMoreNext = useInfiniteReaderStore(selectHasMoreNext);

  // Get actions
  const setChapterLoading = useInfiniteReaderStore((s) => s.setChapterLoading);
  const setChapterLoaded = useInfiniteReaderStore((s) => s.setChapterLoaded);
  const setChapterError = useInfiniteReaderStore((s) => s.setChapterError);
  const loadedChapters = useInfiniteReaderStore((s) => s.loadedChapters);
  const chapterStates = useInfiniteReaderStore((s) => s.chapterStates);

  // Get current chapter info
  const currentChapter = chapters[currentChapterIndex];
  const currentLoaded = loadedChapters.get(currentChapter?.id ?? "");
  const totalPages = currentLoaded?.pages.length ?? 0;

  // Debounce ref
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Query client for manual prefetch
  const queryClient = useQueryClient();

  /**
   * Fetch a chapter's pages
   */
  const fetchChapterPages = useCallback(
    async (chapter: Chapter): Promise<Page[]> => {
      // This will be handled by the caller using React Query's prefetchQuery
      // For now, we just return empty - actual fetching is managed by the component
      return [];
    },
    []
  );

  /**
   * Trigger prefetch for a specific chapter
   */
  const triggerPrefetch = useCallback(
    async (direction: "prev" | "next") => {
      if (!enabled) return;

      const targetIndex =
        direction === "prev"
          ? currentChapterIndex + 1
          : currentChapterIndex - 1;

      const targetChapter = chapters[targetIndex];

      if (!targetChapter) {
        readerLog.prefetch.debug("No chapter to prefetch", { direction });
        return;
      }

      // Check if already loaded or loading
      const state = chapterStates.get(targetChapter.id);
      if (state === "loaded" || state === "loading") {
        readerLog.prefetch.debug("Chapter already loaded/loading", {
          direction,
          chapterId: targetChapter.id,
          state,
        });
        return;
      }

      readerLog.prefetch.info("Fetching chapter", {
        direction,
        chapterId: targetChapter.id,
        chapterNumber: targetChapter.number,
        url: targetChapter.url,
      });

      // Mark as loading
      setChapterLoading(targetChapter.id);

      try {
        // Actually fetch the pages using React Query
        const pages = await queryClient.fetchQuery({
          queryKey: ["pages", sourceId, targetChapter.url],
          queryFn: async () => {
            const source = await import("@/sources").then((m) =>
              m.getSource(sourceId)
            );
            if (!source) throw new Error(`Source ${sourceId} not found`);
            return source.getPageList(targetChapter.url);
          },
          staleTime: 10 * 60 * 1000,
        });

        readerLog.prefetch.info("Chapter fetched successfully", {
          chapterId: targetChapter.id,
          pagesCount: pages.length,
        });

        setChapterLoaded(targetChapter.id, targetChapter, pages);
      } catch (error) {
        readerLog.prefetch.error("Chapter fetch failed", {
          chapterId: targetChapter.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        setChapterError(
          targetChapter.id,
          error instanceof Error ? error.message : "Failed to load chapter"
        );
      }
    },
    [
      enabled,
      currentChapterIndex,
      chapters,
      chapterStates,
      setChapterLoading,
      setChapterLoaded,
      setChapterError,
      queryClient,
      sourceId,
    ]
  );

  // =========================================================================
  // Watch for prefetch triggers
  // =========================================================================
  useEffect(() => {
    if (!enabled || totalPages === 0) return;

    // Clear any pending prefetch
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Check if near end (prefetch next)
    const pagesFromEnd = totalPages - currentPage;
    if (pagesFromEnd <= READER_CONFIG.PREFETCH_THRESHOLD && hasMoreNext) {
      readerLog.prefetch.debug("Near end, scheduling prefetch next", {
        currentPage,
        totalPages,
        pagesFromEnd,
      });

      prefetchTimeoutRef.current = setTimeout(() => {
        triggerPrefetch("next");
      }, READER_CONFIG.PREFETCH_DEBOUNCE_MS);
    }

    // Check if near start (prefetch prev)
    if (currentPage <= READER_CONFIG.PREFETCH_THRESHOLD && hasMorePrev) {
      readerLog.prefetch.debug("Near start, scheduling prefetch prev", {
        currentPage,
      });

      prefetchTimeoutRef.current = setTimeout(() => {
        triggerPrefetch("prev");
      }, READER_CONFIG.PREFETCH_DEBOUNCE_MS);
    }

    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [
    currentPage,
    totalPages,
    hasMoreNext,
    hasMorePrev,
    enabled,
    triggerPrefetch,
  ]);

  return {
    triggerPrefetch,
  };
}

/**
 * Hook to load a specific chapter's pages.
 * Used by the container to actually fetch pages.
 */
export function useLoadChapter(
  sourceId: string,
  chapterId: string | undefined,
  chapterUrl: string | undefined
) {
  const {
    data: pages,
    isLoading,
    error,
  } = useChapterPages(sourceId, chapterUrl ?? "");

  const setChapterLoaded = useInfiniteReaderStore((s) => s.setChapterLoaded);
  const setChapterError = useInfiniteReaderStore((s) => s.setChapterError);
  const chapters = useInfiniteReaderStore(selectChapters);

  // Update store when pages load
  useEffect(() => {
    if (!chapterId) return;

    if (pages && pages.length > 0) {
      const chapter = chapters.find((c) => c.id === chapterId);
      if (chapter) {
        setChapterLoaded(chapterId, chapter, pages);
      }
    } else if (error) {
      setChapterError(
        chapterId,
        error instanceof Error ? error.message : "Failed to load chapter"
      );
    }
  }, [pages, error, chapterId, chapters, setChapterLoaded, setChapterError]);

  return { pages, isLoading, error };
}
