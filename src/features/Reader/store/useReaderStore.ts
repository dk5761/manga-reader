import { create } from "zustand";

export interface ReaderState {
  // Core reading state
  currentPage: number;
  totalPages: number;
  initialPage: number;

  // UI state
  isControlsVisible: boolean;

  // Metadata (set once on init)
  mangaId: string;
  chapterId: string;
  chapterNumber: number;
  sourceId: string;

  // Flags
  isInitialized: boolean;
  markedAsRead: boolean;
}

export interface ReaderActions {
  // Actions
  setPage: (page: number) => void;
  toggleControls: () => void;
  setMarkedAsRead: () => void;
  initialize: (data: InitData) => void;
  reset: () => void;
}

export interface InitData {
  initialPage: number;
  totalPages: number;
  mangaId: string;
  chapterId: string;
  chapterNumber: number;
  sourceId: string;
}

const initialState: ReaderState = {
  currentPage: 1,
  totalPages: 0,
  initialPage: 1,
  isControlsVisible: true,
  mangaId: "",
  chapterId: "",
  chapterNumber: 0,
  sourceId: "",
  isInitialized: false,
  markedAsRead: false,
};

export const useReaderStore = create<ReaderState & ReaderActions>((set) => ({
  ...initialState,

  setPage: (page) => set({ currentPage: page }),

  toggleControls: () =>
    set((state) => ({ isControlsVisible: !state.isControlsVisible })),

  setMarkedAsRead: () => set({ markedAsRead: true }),

  initialize: (data) =>
    set({
      initialPage: data.initialPage,
      currentPage: data.initialPage,
      totalPages: data.totalPages,
      mangaId: data.mangaId,
      chapterId: data.chapterId,
      chapterNumber: data.chapterNumber,
      sourceId: data.sourceId,
      isInitialized: true,
      markedAsRead: false,
    }),

  reset: () => set(initialState),
}));
