import { useCallback, useRef } from "react";
import { useChapterPages } from "../api/reader.queries";
import { useReaderStore } from "../store/useReaderStore";
import type { Chapter } from "@/sources";
import type { ChapterSegment } from "../types";

/**
 * Hook to manage loading adjacent chapters for infinite scrolling.
 * Loads prev/next chapters on demand and manages the loaded segments.
 */
export function useChapterSegments(
  chapters: Chapter[] | undefined,
  sourceId: string
) {
  const addSegment = useReaderStore((s) => s.addSegment);
  const updateSegment = useReaderStore((s) => s.updateSegment);
  const setLoadingPrev = useReaderStore((s) => s.setLoadingPrev);
  const setLoadingNext = useReaderStore((s) => s.setLoadingNext);
  const loadedSegments = useReaderStore((s) => s.loadedSegments);
  const chapterIndex = useReaderStore((s) => s.chapterIndex);

  // Track which chapters we've started loading
  const loadingRef = useRef<Set<string>>(new Set());

  /**
   * Load a chapter's pages and add to segments
   */
  const loadChapter = useCallback(
    async (chapter: Chapter, targetIndex: number) => {
      if (!chapter || loadingRef.current.has(chapter.id)) {
        return;
      }

      // Skip if already loaded
      if (loadedSegments.some((s) => s.chapterId === chapter.id)) {
        return;
      }

      loadingRef.current.add(chapter.id);

      // Add placeholder segment
      const placeholderSegment: ChapterSegment = {
        chapterId: chapter.id,
        chapterIndex: targetIndex,
        chapter,
        pages: [],
        isLoading: true,
      };
      addSegment(placeholderSegment);

      try {
        // Fetch pages - this is async
        const response = await fetch(
          `https://api.example.com/pages?source=${sourceId}&url=${encodeURIComponent(
            chapter.url
          )}`
        );
        // Note: In real implementation, use the actual API hooks
        // For now, we'll defer this to the container which has access to query hooks

        // This hook just manages the state - actual fetching happens in container
      } catch (error) {
        updateSegment(chapter.id, {
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load",
        });
      } finally {
        loadingRef.current.delete(chapter.id);
      }
    },
    [addSegment, updateSegment, loadedSegments, sourceId]
  );

  /**
   * Load previous chapter (higher index in chapters array)
   */
  const loadPrevChapter = useCallback(() => {
    if (!chapters || chapterIndex >= chapters.length - 1) {
      return null;
    }

    const prevChapter = chapters[chapterIndex + 1];
    if (
      prevChapter &&
      !loadedSegments.some((s) => s.chapterId === prevChapter.id)
    ) {
      setLoadingPrev(true);
      return { chapter: prevChapter, index: chapterIndex + 1 };
    }
    return null;
  }, [chapters, chapterIndex, loadedSegments, setLoadingPrev]);

  /**
   * Load next chapter (lower index in chapters array)
   */
  const loadNextChapter = useCallback(() => {
    if (!chapters || chapterIndex <= 0) {
      return null;
    }

    const nextChapter = chapters[chapterIndex - 1];
    if (
      nextChapter &&
      !loadedSegments.some((s) => s.chapterId === nextChapter.id)
    ) {
      setLoadingNext(true);
      return { chapter: nextChapter, index: chapterIndex - 1 };
    }
    return null;
  }, [chapters, chapterIndex, loadedSegments, setLoadingNext]);

  return {
    loadPrevChapter,
    loadNextChapter,
    loadChapter,
  };
}
