/**
 * InfiniteReaderContainer
 * Main orchestration component for seamless chapter scrolling.
 */

import { useEffect, useRef, useCallback } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Data
import { useChapterPages } from "../api/reader.queries";
import { useChapterList } from "../../Manga/api/manga.queries";
import { getSource } from "@/sources";

// Store
import { useInfiniteReaderStore } from "../store/useInfiniteReaderStore";

// Hooks
import { useReaderItems, useInitialScrollIndex } from "../hooks/useReaderItems";
import {
  useChapterPrefetch,
  useLoadChapter,
} from "../hooks/useChapterPrefetch";
import { useReaderKeepAwake } from "../hooks/useReaderKeepAwake";
import { useSaveHistory } from "../hooks/useSaveHistory";
import { useMarkChapterRead } from "@/features/Library/hooks";

// Components
import { InfiniteWebtoonReader } from "./InfiniteWebtoonReader";
import { ReaderControls } from "./ReaderControls";
import { BrightnessOverlay } from "./BrightnessOverlay";

// Utils
import { readerLog } from "../utils/reader-logger";

// ============================================================================
// Back Button Overlay
// ============================================================================

function BackButtonOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="absolute top-0 left-0 right-0 z-10"
    >
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center px-4 py-3"
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
        <Text className="text-white ml-2 text-base font-medium">Back</Text>
      </Pressable>
    </View>
  );
}

// ============================================================================
// Main Container
// ============================================================================

export function InfiniteReaderContainer() {
  useReaderKeepAwake();

  const router = useRouter();
  const {
    chapterId,
    sourceId,
    url,
    mangaUrl,
    mangaId,
    mangaTitle,
    mangaCover,
  } = useLocalSearchParams<{
    chapterId: string;
    sourceId: string;
    url: string;
    mangaUrl: string;
    mangaId?: string;
    mangaTitle?: string;
    mangaCover?: string;
  }>();

  // Source info
  const source = getSource(sourceId || "");

  // Fetch initial chapter pages
  const {
    data: pages,
    isLoading: pagesLoading,
    error: pagesError,
  } = useChapterPages(sourceId || "", url || "");

  // Fetch chapter list
  const { data: chapters } = useChapterList(sourceId || "", mangaUrl || "");

  // Find current chapter info
  const currentChapter = chapters?.find((ch) => ch.url === url);
  const currentChapterIndex = chapters?.findIndex((ch) => ch.url === url) ?? -1;

  // Store state
  const isInitialized = useInfiniteReaderStore((s) => s.isInitialized);
  const initialize = useInfiniteReaderStore((s) => s.initialize);
  const reset = useInfiniteReaderStore((s) => s.reset);
  const currentPage = useInfiniteReaderStore((s) => s.currentPage);
  const markedChapterIds = useInfiniteReaderStore((s) => s.markedChapterIds);

  // For marking as read
  const markChapterRead = useMarkChapterRead();
  const saveHistory = useSaveHistory();

  // Has initialized ref
  const hasInitializedRef = useRef(false);

  // =========================================================================
  // Initialize store when data ready
  // =========================================================================
  const isDataReady =
    !pagesLoading && pages && pages.length > 0 && chapters && currentChapter;

  useEffect(() => {
    if (isDataReady && !hasInitializedRef.current) {
      hasInitializedRef.current = true;

      readerLog.store.info("Initializing infinite reader", {
        chapterId: currentChapter.id,
        chapterNumber: currentChapter.number,
        pagesCount: pages.length,
        totalChapters: chapters.length,
      });

      initialize({
        mangaId: mangaId || "",
        mangaTitle: mangaTitle || "",
        mangaCover: mangaCover || "",
        mangaUrl: mangaUrl || "",
        sourceId: sourceId || "",
        chapters,
        startingChapterId: currentChapter.id,
        startingChapterIndex: currentChapterIndex,
        initialPages: pages,
      });
    }
  }, [
    isDataReady,
    pages,
    chapters,
    currentChapter,
    currentChapterIndex,
    initialize,
    mangaId,
    mangaTitle,
    mangaCover,
    mangaUrl,
    sourceId,
  ]);

  // =========================================================================
  // Prefetch adjacent chapters
  // =========================================================================
  useChapterPrefetch({
    sourceId: sourceId || "",
    enabled: isInitialized,
  });

  // =========================================================================
  // Save history on page change
  // =========================================================================
  useEffect(() => {
    if (!isInitialized || !mangaId || !mangaTitle || !currentChapter) return;

    saveHistory({
      mangaId,
      mangaTitle,
      mangaCover,
      chapterId: currentChapter.id || chapterId || "",
      chapterNumber: currentChapter.number,
      chapterTitle: currentChapter.title,
      chapterUrl: url || "",
      pageReached: currentPage,
      totalPages: pages?.length,
      sourceId: sourceId || "",
    });
  }, [
    isInitialized,
    currentPage,
    mangaId,
    mangaTitle,
    mangaCover,
    currentChapter,
    chapterId,
    url,
    pages?.length,
    sourceId,
    saveHistory,
  ]);

  // =========================================================================
  // Mark chapters as read when tracked
  // =========================================================================
  useEffect(() => {
    if (!mangaId) return;

    for (const readChapterId of markedChapterIds) {
      readerLog.mark.info("Persisting mark-as-read", {
        chapterId: readChapterId,
      });
      markChapterRead(mangaId, readChapterId);
    }
  }, [markedChapterIds, mangaId, markChapterRead]);

  // =========================================================================
  // Reset on unmount
  // =========================================================================
  useEffect(() => {
    return () => {
      readerLog.store.info("Unmounting infinite reader");
      reset();
    };
  }, [reset]);

  // =========================================================================
  // Loading State
  // =========================================================================
  if (pagesLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <BackButtonOverlay />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-zinc-400 mt-4">Loading chapter...</Text>
      </View>
    );
  }

  // =========================================================================
  // Error State
  // =========================================================================
  if (pagesError || !pages || pages.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <BackButtonOverlay />
        <Text className="text-red-500 text-lg font-bold">
          Failed to load pages
        </Text>
        <Text className="text-zinc-400 text-center mt-2">
          {(pagesError as Error)?.message || "No pages found"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-zinc-800 px-6 py-3 rounded-lg"
        >
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // =========================================================================
  // Waiting for initialization
  // =========================================================================
  if (!isInitialized) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <BackButtonOverlay />
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-zinc-400 mt-4">Initializing...</Text>
      </View>
    );
  }

  // =========================================================================
  // Main Reader
  // =========================================================================
  return <InfiniteReaderView chapters={chapters} baseUrl={source?.baseUrl} />;
}

// ============================================================================
// Reader View (Separated for hooks)
// ============================================================================

interface InfiniteReaderViewProps {
  chapters?: import("@/sources").Chapter[];
  baseUrl?: string;
}

function InfiniteReaderView({ chapters, baseUrl }: InfiniteReaderViewProps) {
  const insets = useSafeAreaInsets();

  // Build items from loaded chapters
  const items = useReaderItems();
  const initialScrollIndex = useInitialScrollIndex(items);

  const handleTap = useCallback(() => {
    useInfiniteReaderStore.getState().toggleControls();
  }, []);

  readerLog.items.debug("Rendering with items", { count: items.length });

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-zinc-400 mt-4">Loading pages...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <InfiniteWebtoonReader
        items={items}
        baseUrl={baseUrl}
        initialScrollIndex={initialScrollIndex}
        onTap={handleTap}
        paddingBottom={insets.bottom}
      />

      <BrightnessOverlay />

      <ReaderControls chapters={chapters} onScrollToPage={() => {}} />
    </View>
  );
}
