// Models
export type { ReaderPage } from "./ReaderPage";
export { createReaderPage, createReaderPages } from "./ReaderPage";

export type { ReaderChapter, ChapterState } from "./ReaderChapter";
export {
  createReaderChapter,
  isChapterLoaded,
  getChapterPages,
} from "./ReaderChapter";

export type { ChapterTransition } from "./ChapterTransition";
export {
  createPrevTransition,
  createNextTransition,
  hasDestination,
  getTransitionStatus,
} from "./ChapterTransition";

/**
 * ViewerChapters - The three-chapter window for seamless scrolling.
 * Matches Mihon's ViewerChapters data class.
 */
export interface ViewerChapters {
  /** Previous chapter (can scroll up into) */
  prev: import("./ReaderChapter").ReaderChapter | null;
  /** Currently active chapter */
  curr: import("./ReaderChapter").ReaderChapter;
  /** Next chapter (can scroll down into) */
  next: import("./ReaderChapter").ReaderChapter | null;
}

/**
 * AdapterItem - Union type for all items in the reader list.
 */
export type AdapterItem =
  | import("./ReaderPage").ReaderPage
  | import("./ChapterTransition").ChapterTransition;

/**
 * Type guard to check if item is a page
 */
export function isPageItem(
  item: AdapterItem
): item is import("./ReaderPage").ReaderPage {
  return item.type === "page";
}

/**
 * Type guard to check if item is a transition
 */
export function isTransitionItem(
  item: AdapterItem
): item is import("./ChapterTransition").ChapterTransition {
  return item.type === "transition";
}
