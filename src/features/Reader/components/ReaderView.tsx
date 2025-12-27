import { memo, useCallback, useRef } from "react";
import { View, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebtoonReader, WebtoonReaderHandle } from "./WebtoonReader";
import { ReaderControls } from "./ReaderControls";
import { useReaderStore } from "../store/useReaderStore";
import {
  useSaveProgress,
  useMarkChapterRead,
  useAddHistoryEntry,
} from "@/features/Library/hooks";
import type { Page, Chapter } from "@/sources";
import type { MangaSchema } from "@/core/database";

interface ReaderViewProps {
  pages: Page[];
  baseUrl?: string;
  chapters?: Chapter[];
  currentChapter?: Chapter;
  libraryManga?: MangaSchema | null;
}

/**
 * ReaderView is the pure UI component for the reader.
 * It's memoized and receives stable props from ReaderContainer.
 */
export const ReaderView = memo(function ReaderView({
  pages,
  baseUrl,
  chapters,
  currentChapter,
  libraryManga,
}: ReaderViewProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<WebtoonReaderHandle>(null);
  const lastSavedPage = useRef(0);
  const historyLogged = useRef(false);

  // Progress hooks
  const saveProgress = useSaveProgress();
  const markChapterRead = useMarkChapterRead();
  const addHistoryEntry = useAddHistoryEntry();

  // Get store values and actions
  const initialPage = useReaderStore((s) => s.initialPage);
  const totalPages = useReaderStore((s) => s.totalPages);
  const mangaId = useReaderStore((s) => s.mangaId);
  const chapterId = useReaderStore((s) => s.chapterId);
  const chapterNumber = useReaderStore((s) => s.chapterNumber);
  const sourceId = useReaderStore((s) => s.sourceId);
  const markedAsRead = useReaderStore((s) => s.markedAsRead);

  const handlePageChange = useCallback(
    (page: number) => {
      // Update store (no re-render in this component, only subscribers)
      useReaderStore.getState().setPage(page);

      // Log history on first page view
      if (!historyLogged.current && libraryManga && currentChapter) {
        historyLogged.current = true;
        addHistoryEntry({
          mangaId,
          mangaTitle: libraryManga.title,
          mangaCover: libraryManga.localCover || libraryManga.cover,
          chapterId,
          chapterNumber,
          chapterTitle: currentChapter.title,
          chapterUrl: currentChapter.url || "",
          pageReached: page,
          totalPages,
          sourceId,
        });
      }

      // Auto-save progress every 3 pages or at key positions
      const shouldSave =
        Math.abs(page - lastSavedPage.current) >= 3 ||
        page === 1 ||
        page === totalPages;

      if (shouldSave && libraryManga) {
        saveProgress(mangaId, chapterId, chapterNumber, page);
        lastSavedPage.current = page;

        // Update history entry
        addHistoryEntry({
          mangaId,
          mangaTitle: libraryManga.title,
          mangaCover: libraryManga.localCover || libraryManga.cover,
          chapterId,
          chapterNumber,
          chapterTitle: currentChapter?.title,
          chapterUrl: currentChapter?.url || "",
          pageReached: page,
          totalPages,
          sourceId,
        });
      }

      // Mark as read when reaching last page
      if (page >= totalPages && totalPages > 0 && !markedAsRead) {
        useReaderStore.getState().setMarkedAsRead();
        markChapterRead(mangaId, chapterId, totalPages);
      }
    },
    [
      libraryManga,
      currentChapter,
      mangaId,
      chapterId,
      chapterNumber,
      totalPages,
      sourceId,
      markedAsRead,
      saveProgress,
      markChapterRead,
      addHistoryEntry,
    ]
  );

  const handleTap = useCallback(() => {
    useReaderStore.getState().toggleControls();
  }, []);

  const handleScrollToPage = useCallback((page: number) => {
    const targetIndex = page - 1;
    scrollViewRef.current?.scrollToIndex(targetIndex, true);
  }, []);

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      <WebtoonReader
        ref={scrollViewRef}
        pages={pages}
        baseUrl={baseUrl}
        initialPage={initialPage}
        onPageChange={handlePageChange}
        onTap={handleTap}
        paddingBottom={insets.bottom}
      />

      <ReaderControls chapters={chapters} onScrollToPage={handleScrollToPage} />
    </View>
  );
});
