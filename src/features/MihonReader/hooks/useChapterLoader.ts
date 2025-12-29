import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSource } from "@/sources";
import type { Page } from "@/sources";
import { useViewerStore } from "../store/viewer.store";
import type { ReaderChapter, ChapterState } from "../models";
import { createReaderPages } from "../models";

/**
 * Hook for loading chapter pages from the source.
 * Matches Mihon's ChapterLoader.loadChapter() logic.
 */
export function useChapterLoader() {
  const sourceId = useViewerStore((s) => s.sourceId);
  const updateChapterState = useViewerStore((s) => s.updateChapterState);
  const queryClient = useQueryClient();

  // Track in-flight loads to prevent duplicates
  const loadingRef = useRef<Set<string>>(new Set());

  /**
   * Load pages for a chapter.
   * Updates the chapter state in the store as it progresses.
   */
  const loadChapter = useCallback(
    async (chapter: ReaderChapter): Promise<void> => {
      const chapterId = chapter.chapter.id;
      const chapterUrl = chapter.chapter.url;

      // Skip if already loaded
      if (chapter.state.status === "loaded") {
        return;
      }

      // Skip if already loading
      if (loadingRef.current.has(chapterId)) {
        return;
      }

      const source = getSource(sourceId);
      if (!source) {
        updateChapterState(chapterId, {
          status: "error",
          error: `Source ${sourceId} not found`,
        });
        return;
      }

      loadingRef.current.add(chapterId);
      updateChapterState(chapterId, { status: "loading" });

      try {
        // Check React Query cache first
        const cachedPages = queryClient.getQueryData<Page[]>([
          "pages",
          sourceId,
          chapterUrl,
        ]);

        let pages: Page[];

        if (cachedPages) {
          pages = cachedPages;
        } else {
          // Fetch from source
          pages = await source.getPageList(chapterUrl);

          // Cache the result
          queryClient.setQueryData(["pages", sourceId, chapterUrl], pages);
        }

        // Convert to ReaderPages
        const readerPages = createReaderPages(pages, chapterId);

        updateChapterState(chapterId, {
          status: "loaded",
          pages: readerPages,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load chapter";
        updateChapterState(chapterId, {
          status: "error",
          error: message,
        });
      } finally {
        loadingRef.current.delete(chapterId);
      }
    },
    [sourceId, updateChapterState, queryClient]
  );

  /**
   * Retry loading a failed chapter.
   */
  const retryChapter = useCallback(
    async (chapter: ReaderChapter): Promise<void> => {
      // Reset state to wait, then load
      updateChapterState(chapter.chapter.id, { status: "wait" });
      await loadChapter({
        ...chapter,
        state: { status: "wait" },
      });
    },
    [loadChapter, updateChapterState]
  );

  return { loadChapter, retryChapter };
}
