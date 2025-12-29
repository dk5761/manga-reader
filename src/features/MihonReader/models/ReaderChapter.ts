import type { Chapter } from "@/sources";
import type { ReaderPage } from "./ReaderPage";

/**
 * ChapterState - State machine for chapter loading.
 * Matches Mihon's ReaderChapter.State sealed interface.
 */
export type ChapterState =
  | { status: "wait" }
  | { status: "loading" }
  | { status: "loaded"; pages: ReaderPage[] }
  | { status: "error"; error: string };

/**
 * ReaderChapter - A chapter with its loading state and pages.
 * Matches Mihon's ReaderChapter data class.
 */
export interface ReaderChapter {
  /** The underlying chapter data from the source */
  chapter: Chapter;
  /** Current loading state */
  state: ChapterState;
  /** Page to resume reading from (0-indexed) */
  requestedPage: number;
}

/**
 * Create a new ReaderChapter in wait state
 */
export function createReaderChapter(
  chapter: Chapter,
  requestedPage = 0
): ReaderChapter {
  return {
    chapter,
    state: { status: "wait" },
    requestedPage,
  };
}

/**
 * Check if chapter is loaded
 */
export function isChapterLoaded(
  chapter: ReaderChapter
): chapter is ReaderChapter & {
  state: { status: "loaded"; pages: ReaderPage[] };
} {
  return chapter.state.status === "loaded";
}

/**
 * Get pages from a loaded chapter, or null if not loaded
 */
export function getChapterPages(chapter: ReaderChapter): ReaderPage[] | null {
  if (chapter.state.status === "loaded") {
    return chapter.state.pages;
  }
  return null;
}
