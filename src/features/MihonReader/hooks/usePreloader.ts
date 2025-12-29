import { useCallback, useEffect, useRef } from "react";
import { useChapterLoader } from "./useChapterLoader";
import { useViewerStore } from "../store/viewer.store";
import type { ReaderChapter, ViewerChapters } from "../models";

/**
 * Hook that handles preloading of adjacent chapters.
 * Matches Mihon's preload() logic in ReaderViewModel.
 */
export function usePreloader() {
  const { loadChapter } = useChapterLoader();
  const viewerChapters = useViewerStore((s) => s.viewerChapters);

  // Track which chapters have been preloaded this session
  const preloadedRef = useRef<Set<string>>(new Set());

  /**
   * Preload a specific chapter.
   */
  const preloadChapter = useCallback(
    async (chapter: ReaderChapter) => {
      const chapterId = chapter.chapter.id;

      // Skip if already loaded or loading
      if (
        chapter.state.status === "loaded" ||
        chapter.state.status === "loading"
      ) {
        return;
      }

      // Skip if already attempted this session
      if (preloadedRef.current.has(chapterId)) {
        return;
      }

      preloadedRef.current.add(chapterId);
      console.log("[usePreloader] Preloading chapter:", chapterId);

      await loadChapter(chapter);
    },
    [loadChapter]
  );

  /**
   * Preload both adjacent chapters.
   * Called on initial load.
   */
  const preloadAdjacent = useCallback(async () => {
    if (!viewerChapters) return;

    const { prev, next } = viewerChapters;

    // Preload next chapter first (more likely to be needed)
    if (next && next.state.status === "wait") {
      await preloadChapter(next);
    }

    // Then preload prev
    if (prev && prev.state.status === "wait") {
      await preloadChapter(prev);
    }
  }, [viewerChapters, preloadChapter]);

  /**
   * Reset preload tracking (call when navigating to new manga).
   */
  const resetPreloadTracking = useCallback(() => {
    preloadedRef.current.clear();
  }, []);

  return {
    preloadChapter,
    preloadAdjacent,
    resetPreloadTracking,
  };
}
