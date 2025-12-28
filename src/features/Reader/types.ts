import type { Page, Chapter } from "@/sources";

/**
 * Reader item types for infinite chapter scrolling.
 * The list renders a mix of page images and chapter transitions.
 */

/**
 * A page item - represents a single manga page image
 */
export interface PageItem {
  type: "page";
  page: Page;
  chapterId: string;
  chapterIndex: number; // Index in the chapters array
}

/**
 * A transition item - separator between chapters
 */
export interface TransitionItem {
  type: "transition";
  direction: "prev" | "next" | "current-start" | "current-end";
  chapter: Chapter | null; // The chapter being transitioned to/from
  chapterId: string | null;
  isLoading?: boolean;
  error?: string;
}

/**
 * Union type for all reader list items
 */
export type ReaderItem = PageItem | TransitionItem;

/**
 * Chapter segment - a loaded chapter with its pages
 */
export interface ChapterSegment {
  chapterId: string;
  chapterIndex: number;
  chapter: Chapter;
  pages: Page[];
  isLoading: boolean;
  error?: string;
}

/**
 * Helper to create a page item
 */
export function createPageItem(
  page: Page,
  chapterId: string,
  chapterIndex: number
): PageItem {
  return {
    type: "page",
    page,
    chapterId,
    chapterIndex,
  };
}

/**
 * Helper to create a transition item
 */
export function createTransitionItem(
  direction: TransitionItem["direction"],
  chapter: Chapter | null,
  options?: { isLoading?: boolean; error?: string }
): TransitionItem {
  return {
    type: "transition",
    direction,
    chapter,
    chapterId: chapter?.id ?? null,
    isLoading: options?.isLoading,
    error: options?.error,
  };
}

/**
 * Build reader items from chapter segments
 */
export function buildReaderItems(
  segments: ChapterSegment[],
  chapters: Chapter[],
  currentChapterIndex: number
): ReaderItem[] {
  const items: ReaderItem[] = [];

  // Add "previous chapter" transition at start if not first chapter
  const hasPrevChapter = currentChapterIndex < chapters.length - 1;
  if (hasPrevChapter) {
    const prevChapter = chapters[currentChapterIndex + 1];
    items.push(createTransitionItem("prev", prevChapter));
  } else {
    items.push(createTransitionItem("prev", null));
  }

  // Add all loaded segments
  for (const segment of segments) {
    // Add pages from this segment
    for (const page of segment.pages) {
      items.push(createPageItem(page, segment.chapterId, segment.chapterIndex));
    }
  }

  // Add "next chapter" transition at end if not last chapter
  const hasNextChapter = currentChapterIndex > 0;
  if (hasNextChapter) {
    const nextChapter = chapters[currentChapterIndex - 1];
    items.push(createTransitionItem("next", nextChapter));
  } else {
    items.push(createTransitionItem("next", null));
  }

  return items;
}

/**
 * Get unique key for a reader item
 */
export function getReaderItemKey(item: ReaderItem, index: number): string {
  if (item.type === "page") {
    return `page-${item.chapterId}-${item.page.index}`;
  }
  return `transition-${item.direction}-${item.chapterId ?? "none"}-${index}`;
}
