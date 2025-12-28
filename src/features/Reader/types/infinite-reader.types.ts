/**
 * Infinite Reader Types
 * Centralized type definitions for seamless chapter scrolling.
 */

import type { Page, Chapter } from "@/sources";

// ============================================================================
// Core Types
// ============================================================================

/**
 * A loaded chapter with its pages and metadata
 */
export interface LoadedChapter {
  chapter: Chapter;
  pages: Page[];
  loadedAt: number;
}

/**
 * Page item - represents a single manga page image
 */
export interface PageItem {
  type: "page";
  page: Page;
  chapterId: string;
  chapterIndex: number;
}

/**
 * Transition item - separator between chapters
 */
export interface TransitionItem {
  type: "transition";
  direction: "prev" | "next";
  targetChapter: Chapter | null;
  fromChapter: Chapter;
  isLoading: boolean;
  error?: string;
}

/**
 * Union type for all reader list items
 */
export type ReaderItem = PageItem | TransitionItem;

// ============================================================================
// Store State Types
// ============================================================================

/**
 * Loading state for a chapter
 */
export type ChapterLoadingState = "idle" | "loading" | "loaded" | "error";

/**
 * Infinite reader store state
 */
export interface InfiniteReaderState {
  // Manga context
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  mangaUrl: string;
  sourceId: string;

  // Chapter data
  chapters: Chapter[];
  loadedChapters: Map<string, LoadedChapter>;
  chapterStates: Map<string, ChapterLoadingState>;
  chapterErrors: Map<string, string>;

  // Current state
  startingChapterId: string;
  currentChapterId: string;
  currentChapterIndex: number;
  currentPage: number;

  // Boundaries
  hasMorePrev: boolean;
  hasMoreNext: boolean;

  // UI state
  isControlsVisible: boolean;
  brightness: number;
  isInitialized: boolean;
  isSliderDragging: boolean;

  // Read tracking
  markedChapterIds: Set<string>;
}

/**
 * Initialization data for the store
 */
export interface InfiniteReaderInitData {
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  mangaUrl: string;
  sourceId: string;
  chapters: Chapter[];
  startingChapterId: string;
  startingChapterIndex: number;
  initialPages: Page[];
}

/**
 * Store actions
 */
export interface InfiniteReaderActions {
  // Lifecycle
  initialize: (data: InfiniteReaderInitData) => void;
  reset: () => void;

  // Chapter loading
  setChapterLoading: (chapterId: string) => void;
  setChapterLoaded: (
    chapterId: string,
    chapter: Chapter,
    pages: Page[]
  ) => void;
  setChapterError: (chapterId: string, error: string) => void;
  unloadChapter: (chapterId: string) => void;

  // Navigation
  setCurrentChapter: (chapterId: string, chapterIndex: number) => void;
  setCurrentPage: (page: number) => void;

  // UI
  toggleControls: () => void;
  setBrightness: (value: number) => void;
  setSliderDragging: (value: boolean) => void;
  setPage: (page: number) => void;

  // Read tracking
  markChapterAsRead: (chapterId: string) => void;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Prefetch direction
 */
export type PrefetchDirection = "prev" | "next";

/**
 * Scroll info for visibility tracking
 */
export interface ScrollInfo {
  offsetY: number;
  layoutHeight: number;
  contentHeight: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Reader configuration constants
 */
export const READER_CONFIG = {
  /** Pages from end to trigger prefetch */
  PREFETCH_THRESHOLD: 5,
  /** Max chapters to keep in memory */
  MAX_LOADED_CHAPTERS: 3,
  /** Pages from adjacent chapters to include in list */
  ADJACENT_PAGES_COUNT: 2,
  /** Debounce time for prefetch triggers (ms) */
  PREFETCH_DEBOUNCE_MS: 300,
  /** Scroll threshold to detect boundary (px) */
  SCROLL_BOUNDARY_THRESHOLD: 200,
} as const;

// ============================================================================
// Builder Functions
// ============================================================================

/**
 * Create a page item
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
 * Create a transition item
 */
export function createTransitionItem(
  direction: "prev" | "next",
  fromChapter: Chapter,
  targetChapter: Chapter | null,
  options?: { isLoading?: boolean; error?: string }
): TransitionItem {
  return {
    type: "transition",
    direction,
    fromChapter,
    targetChapter,
    isLoading: options?.isLoading ?? false,
    error: options?.error,
  };
}

/**
 * Get unique key for a reader item
 */
export function getReaderItemKey(item: ReaderItem, index: number): string {
  if (item.type === "page") {
    return `page-${item.chapterId}-${item.page.index}`;
  }
  return `transition-${item.direction}-${item.fromChapter.id}-${index}`;
}
