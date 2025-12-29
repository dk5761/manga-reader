import { create } from "zustand";
import type {
  ViewerChapters,
  AdapterItem,
  ReaderChapter,
  ChapterState,
} from "../models";

/**
 * ViewerState - Core state matching Mihon's ReaderViewModel.
 */
export interface ViewerState {
  // === Chapter Window (Mihon's ViewerChapters) ===
  viewerChapters: ViewerChapters | null;

  // === Current Item Tracking ===
  /** Currently visible item (page or transition) */
  currentItem: AdapterItem | null;

  // === UI State ===
  /** Whether menu overlay is visible */
  menuVisible: boolean;
  /** Current page number (1-indexed for display) */
  currentPage: number;
  /** Total pages in current chapter */
  totalPages: number;

  // === Manga Context ===
  mangaId: string;
  sourceId: string;
  mangaTitle: string;
  mangaUrl: string;

  // === Lifecycle ===
  isInitialized: boolean;
}

/**
 * InitData - Data required to initialize the viewer.
 */
export interface ViewerInitData {
  mangaId: string;
  sourceId: string;
  mangaTitle: string;
  mangaUrl: string;
  viewerChapters: ViewerChapters;
}

/**
 * ViewerActions - All store actions.
 */
export interface ViewerActions {
  // === Initialization ===
  init(data: ViewerInitData): void;
  reset(): void;

  // === Chapter Management ===
  /**
   * Set the three-chapter window.
   * Called when current chapter changes.
   */
  setViewerChapters(chapters: ViewerChapters): void;

  /**
   * Update a specific chapter's state (loading → loaded, etc.)
   */
  updateChapterState(chapterId: string, state: ChapterState): void;

  // === Item Tracking ===
  setCurrentItem(item: AdapterItem | null): void;

  // === Page Tracking ===
  setCurrentPage(page: number, total: number): void;

  // === UI ===
  toggleMenu(): void;
  showMenu(): void;
  hideMenu(): void;
}

const initialState: ViewerState = {
  viewerChapters: null,
  currentItem: null,
  menuVisible: false,
  currentPage: 1,
  totalPages: 0,
  mangaId: "",
  sourceId: "",
  mangaTitle: "",
  mangaUrl: "",
  isInitialized: false,
};

/**
 * useViewerStore - Zustand store matching Mihon's ReaderViewModel.
 */
export const useViewerStore = create<ViewerState & ViewerActions>(
  (set, get) => ({
    ...initialState,

    // === Initialization ===
    init: (data) => {
      const { viewerChapters } = data;
      const currPages =
        viewerChapters.curr.state.status === "loaded"
          ? viewerChapters.curr.state.pages
          : [];

      set({
        mangaId: data.mangaId,
        sourceId: data.sourceId,
        mangaTitle: data.mangaTitle,
        mangaUrl: data.mangaUrl,
        viewerChapters: data.viewerChapters,
        currentPage: viewerChapters.curr.requestedPage + 1 || 1,
        totalPages: currPages.length,
        isInitialized: true,
        menuVisible: false,
      });
    },

    reset: () => set(initialState),

    // === Chapter Management ===
    setViewerChapters: (chapters) => {
      const currPages =
        chapters.curr.state.status === "loaded"
          ? chapters.curr.state.pages
          : [];

      set({
        viewerChapters: chapters,
        totalPages: currPages.length,
        // Reset page to 1 when changing chapters via this method
        currentPage: 1,
      });
    },

    updateChapterState: (chapterId, state) => {
      const { viewerChapters } = get();
      if (!viewerChapters) return;

      const updateChapter = (
        ch: ReaderChapter | null
      ): ReaderChapter | null => {
        if (!ch || ch.chapter.id !== chapterId) return ch;
        return { ...ch, state };
      };

      const newChapters: ViewerChapters = {
        prev: updateChapter(viewerChapters.prev),
        curr: updateChapter(viewerChapters.curr) as ReaderChapter,
        next: updateChapter(viewerChapters.next),
      };

      // Update totalPages if current chapter was updated
      const currPages =
        newChapters.curr.state.status === "loaded"
          ? newChapters.curr.state.pages
          : [];

      set({
        viewerChapters: newChapters,
        totalPages: currPages.length,
      });
    },

    // === Item Tracking ===
    setCurrentItem: (item) => set({ currentItem: item }),

    // === Page Tracking ===
    setCurrentPage: (page, total) =>
      set({
        currentPage: page,
        totalPages: total,
      }),

    // === UI ===
    toggleMenu: () => set((s) => ({ menuVisible: !s.menuVisible })),
    showMenu: () => set({ menuVisible: true }),
    hideMenu: () => set({ menuVisible: false }),
  })
);
