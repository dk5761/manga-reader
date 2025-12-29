import type { Page } from "@/sources";

/**
 * ReaderPage - A single page item in the reader list.
 * Matches Mihon's ReaderPage model.
 */
export interface ReaderPage {
  type: "page";
  /** 0-based index within the chapter */
  index: number;
  /** Source page data (imageUrl, headers, etc.) */
  page: Page;
  /** ID of the chapter this page belongs to */
  chapterId: string;
}

/**
 * Create a ReaderPage from a source Page
 */
export function createReaderPage(
  page: Page,
  index: number,
  chapterId: string
): ReaderPage {
  return {
    type: "page",
    index,
    page,
    chapterId,
  };
}

/**
 * Create multiple ReaderPages from an array of source Pages
 */
export function createReaderPages(
  pages: Page[],
  chapterId: string
): ReaderPage[] {
  return pages.map((page, index) => createReaderPage(page, index, chapterId));
}
