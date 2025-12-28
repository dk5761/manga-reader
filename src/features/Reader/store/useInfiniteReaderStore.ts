/**
 * Infinite Reader Store
 * Zustand store for seamless chapter scrolling state management.
 */

import { create } from "zustand";
import { readerLog } from "../utils/reader-logger";
import type {
  InfiniteReaderState,
  InfiniteReaderActions,
  InfiniteReaderInitData,
  LoadedChapter,
  ChapterLoadingState,
  READER_CONFIG,
} from "../types/infinite-reader.types";
import type { Chapter, Page } from "@/sources";

// ============================================================================
// Initial State
// ============================================================================

const initialState: InfiniteReaderState = {
  // Manga context
  mangaId: "",
  mangaTitle: "",
  mangaCover: "",
  mangaUrl: "",
  sourceId: "",

  // Chapter data
  chapters: [],
  loadedChapters: new Map(),
  chapterStates: new Map(),
  chapterErrors: new Map(),

  // Current state
  startingChapterId: "",
  currentChapterId: "",
  currentChapterIndex: -1,
  currentPage: 1,

  // Boundaries
  hasMorePrev: false,
  hasMoreNext: false,

  // UI state
  isControlsVisible: true,
  brightness: 100,
  isInitialized: false,
  isSliderDragging: false,

  // Read tracking
  markedChapterIds: new Set(),
};

// ============================================================================
// Store
// ============================================================================

export const useInfiniteReaderStore = create<
  InfiniteReaderState & InfiniteReaderActions
>((set, get) => ({
  ...initialState,

  // =========================================================================
  // Lifecycle
  // =========================================================================

  initialize: (data: InfiniteReaderInitData) => {
    readerLog.store.info("Initializing", {
      mangaId: data.mangaId,
      startingChapterId: data.startingChapterId,
      chaptersCount: data.chapters.length,
      pagesCount: data.initialPages.length,
    });

    const startingChapter = data.chapters.find(
      (c) => c.id === data.startingChapterId
    );

    if (!startingChapter) {
      readerLog.store.error("Starting chapter not found in chapters list");
      return;
    }

    // Create initial loaded chapter
    const loadedChapters = new Map<string, LoadedChapter>();
    loadedChapters.set(data.startingChapterId, {
      chapter: startingChapter,
      pages: data.initialPages,
      loadedAt: Date.now(),
    });

    // Set initial states
    const chapterStates = new Map<string, ChapterLoadingState>();
    chapterStates.set(data.startingChapterId, "loaded");

    // Calculate boundaries
    const hasMorePrev = data.startingChapterIndex < data.chapters.length - 1;
    const hasMoreNext = data.startingChapterIndex > 0;

    set({
      mangaId: data.mangaId,
      mangaTitle: data.mangaTitle,
      mangaCover: data.mangaCover,
      mangaUrl: data.mangaUrl,
      sourceId: data.sourceId,
      chapters: data.chapters,
      loadedChapters,
      chapterStates,
      chapterErrors: new Map(),
      startingChapterId: data.startingChapterId,
      currentChapterId: data.startingChapterId,
      currentChapterIndex: data.startingChapterIndex,
      currentPage: 1,
      hasMorePrev,
      hasMoreNext,
      isInitialized: true,
      markedChapterIds: new Set(),
    });

    readerLog.store.info("Initialized successfully", {
      hasMorePrev,
      hasMoreNext,
    });
  },

  reset: () => {
    readerLog.store.info("Resetting store");
    set(initialState);
  },

  // =========================================================================
  // Chapter Loading
  // =========================================================================

  setChapterLoading: (chapterId: string) => {
    readerLog.prefetch.info("Loading chapter", { chapterId });

    set((state) => {
      const newStates = new Map(state.chapterStates);
      newStates.set(chapterId, "loading");
      return { chapterStates: newStates };
    });
  },

  setChapterLoaded: (chapterId: string, chapter: Chapter, pages: Page[]) => {
    readerLog.prefetch.info("Chapter loaded", {
      chapterId,
      pagesCount: pages.length,
    });

    set((state) => {
      const newLoaded = new Map(state.loadedChapters);
      newLoaded.set(chapterId, {
        chapter,
        pages,
        loadedAt: Date.now(),
      });

      const newStates = new Map(state.chapterStates);
      newStates.set(chapterId, "loaded");

      const newErrors = new Map(state.chapterErrors);
      newErrors.delete(chapterId);

      return {
        loadedChapters: newLoaded,
        chapterStates: newStates,
        chapterErrors: newErrors,
      };
    });
  },

  setChapterError: (chapterId: string, error: string) => {
    readerLog.prefetch.error("Chapter load failed", { chapterId, error });

    set((state) => {
      const newStates = new Map(state.chapterStates);
      newStates.set(chapterId, "error");

      const newErrors = new Map(state.chapterErrors);
      newErrors.set(chapterId, error);

      return {
        chapterStates: newStates,
        chapterErrors: newErrors,
      };
    });
  },

  unloadChapter: (chapterId: string) => {
    const state = get();

    // Never unload current chapter
    if (chapterId === state.currentChapterId) {
      readerLog.store.warn("Attempted to unload current chapter", {
        chapterId,
      });
      return;
    }

    readerLog.store.info("Unloading chapter", { chapterId });

    set((state) => {
      const newLoaded = new Map(state.loadedChapters);
      newLoaded.delete(chapterId);

      const newStates = new Map(state.chapterStates);
      newStates.delete(chapterId);

      const newErrors = new Map(state.chapterErrors);
      newErrors.delete(chapterId);

      return {
        loadedChapters: newLoaded,
        chapterStates: newStates,
        chapterErrors: newErrors,
      };
    });
  },

  // =========================================================================
  // Navigation
  // =========================================================================

  setCurrentChapter: (chapterId: string, chapterIndex: number) => {
    const state = get();

    if (chapterId === state.currentChapterId) {
      return;
    }

    readerLog.chapter.info("Chapter changed", {
      from: state.currentChapterId,
      to: chapterId,
      newIndex: chapterIndex,
    });

    // Update boundaries
    const hasMorePrev = chapterIndex < state.chapters.length - 1;
    const hasMoreNext = chapterIndex > 0;

    set({
      currentChapterId: chapterId,
      currentChapterIndex: chapterIndex,
      currentPage: 1,
      hasMorePrev,
      hasMoreNext,
    });
  },

  setCurrentPage: (page: number) => {
    const state = get();

    if (page === state.currentPage) {
      return;
    }

    set({ currentPage: page });
  },

  // =========================================================================
  // UI
  // =========================================================================

  toggleControls: () => {
    set((state) => ({ isControlsVisible: !state.isControlsVisible }));
  },

  setBrightness: (value: number) => {
    set({ brightness: Math.max(10, Math.min(100, value)) });
  },

  setSliderDragging: (value: boolean) => {
    set({ isSliderDragging: value });
  },

  setPage: (page: number) => {
    set({ currentPage: Math.max(1, page) });
  },

  // =========================================================================
  // Read Tracking
  // =========================================================================

  markChapterAsRead: (chapterId: string) => {
    const state = get();

    if (state.markedChapterIds.has(chapterId)) {
      return;
    }

    readerLog.mark.info("Marking chapter as read", { chapterId });

    set((state) => {
      const newMarked = new Set(state.markedChapterIds);
      newMarked.add(chapterId);
      return { markedChapterIds: newMarked };
    });
  },
}));

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectLoadedChapters = (state: InfiniteReaderState) =>
  state.loadedChapters;

export const selectCurrentChapter = (state: InfiniteReaderState) => {
  return state.loadedChapters.get(state.currentChapterId);
};

export const selectChapterState = (
  state: InfiniteReaderState,
  chapterId: string
) => {
  return state.chapterStates.get(chapterId) ?? "idle";
};

export const selectIsInitialized = (state: InfiniteReaderState) =>
  state.isInitialized;

export const selectChapters = (state: InfiniteReaderState) => state.chapters;

export const selectCurrentPage = (state: InfiniteReaderState) =>
  state.currentPage;

export const selectCurrentChapterId = (state: InfiniteReaderState) =>
  state.currentChapterId;

export const selectCurrentChapterIndex = (state: InfiniteReaderState) =>
  state.currentChapterIndex;

export const selectBrightness = (state: InfiniteReaderState) =>
  state.brightness;

export const selectIsControlsVisible = (state: InfiniteReaderState) =>
  state.isControlsVisible;

export const selectHasMorePrev = (state: InfiniteReaderState) =>
  state.hasMorePrev;

export const selectHasMoreNext = (state: InfiniteReaderState) =>
  state.hasMoreNext;
