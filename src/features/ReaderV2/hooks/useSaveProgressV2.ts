/**
 * useSaveProgressV2 Hook
 *
 * Saves reading progress (history) with debounce.
 * Prevents excessive DB writes during rapid page changes.
 */

import { useCallback, useRef, useEffect } from "react";
import { useAddHistoryEntry } from "@/features/Library/hooks";
import { useReaderStoreV2 } from "../store/useReaderStoreV2";
import type { Chapter } from "@/sources";

interface ProgressData {
  mangaId: string;
  mangaTitle: string;
  mangaCover?: string;
  mangaUrl?: string;
  chapter: Chapter;
  sourceId: string;
}

const DEBOUNCE_MS = 10000; // Save at most every 10 seconds

/**
 * Hook for saving reading progress with debounce
 */
export function useSaveProgressV2(data: ProgressData | null) {
  const addHistoryEntry = useAddHistoryEntry();
  const lastSavedRef = useRef<number>(0);
  const lastChapterIdRef = useRef<string>("");

  const currentPage = useReaderStoreV2((s) => s.currentPage);
  const totalPages = useReaderStoreV2((s) => s.totalPages);

  const save = useCallback(
    (forceUpdate = false) => {
      if (!data) return;

      const now = Date.now();
      const isNewChapter = data.chapter.id !== lastChapterIdRef.current;

      // Force save on chapter change or if forceUpdate is true
      const shouldForce = forceUpdate || isNewChapter;

      // Debounce: save min every 10s unless forced
      if (!shouldForce && now - lastSavedRef.current < DEBOUNCE_MS) {
        return;
      }

      lastSavedRef.current = now;
      lastChapterIdRef.current = data.chapter.id;

      console.log("[useSaveProgressV2] Saving:", {
        manga: data.mangaTitle,
        chapter: data.chapter.number,
        page: currentPage + 1,
        forced: shouldForce,
      });

      addHistoryEntry({
        mangaId: data.mangaId,
        mangaTitle: data.mangaTitle,
        mangaCover: data.mangaCover,
        mangaUrl: data.mangaUrl,
        chapterId: data.chapter.id,
        chapterNumber: data.chapter.number,
        chapterTitle: data.chapter.title,
        chapterUrl: data.chapter.url,
        pageReached: currentPage + 1, // 1-indexed for display
        totalPages,
        sourceId: data.sourceId,
      });
    },
    [data, currentPage, totalPages, addHistoryEntry]
  );

  // Auto-save on page change (debounced)
  useEffect(() => {
    if (currentPage > 0 && totalPages > 0) {
      save(false);
    }
  }, [currentPage, save]);

  // Force save on unmount
  useEffect(() => {
    return () => {
      save(true);
    };
  }, [save]);

  return { save };
}
