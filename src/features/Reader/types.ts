/**
 * Reader Types
 * Re-export all types from the new infinite-reader types file.
 */

export * from "./types/infinite-reader.types";

// Legacy backward compatibility - old types that might still be referenced
import type { Chapter, Page } from "@/sources";

/**
 * Legacy ReaderItem for old components (ReaderView, WebtoonReader)
 * @deprecated Use ReaderItem from infinite-reader.types.ts
 */
export type LegacyReaderItem =
  | { type: "page"; page: Page; chapterId: string; chapterIndex: number }
  | {
      type: "transition";
      direction: "prev" | "next" | "current-start" | "current-end";
      chapter: Chapter | null;
      chapterId: string | null;
      isLoading?: boolean;
      error?: string;
    };

/**
 * Legacy ChapterSegment type for backward compatibility
 * @deprecated Use types from infinite-reader.types.ts
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
 * @deprecated Use buildReaderItems from infinite-reader.types.ts
 */
export function buildReaderItems(
  segments: ChapterSegment[],
  chapters: Chapter[],
  currentChapterIndex: number
) {
  // Import and use the new implementation
  const {
    buildReaderItems: newBuildReaderItems,
  } = require("./types/infinite-reader.types");
  // This is a stub - the new implementation handles this differently
  return [];
}

/**
 * @deprecated Use getReaderItemKey from infinite-reader.types.ts
 */
export { getReaderItemKey } from "./types/infinite-reader.types";
