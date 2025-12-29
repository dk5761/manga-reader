import { useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getSource } from "@/sources";
import type { Chapter } from "@/sources";
import { useChapterList } from "@/features/Manga/api/manga.queries";
import { WebtoonViewer } from "./WebtoonViewer";
import { ReaderOverlay } from "./ReaderOverlay";
import { useViewerStore } from "../store/viewer.store";
import { useChapterLoader } from "../hooks/useChapterLoader";
import { usePreloader } from "../hooks/usePreloader";
import {
  createReaderChapter,
  createReaderPages,
  type ReaderChapter,
  type ViewerChapters,
} from "../models";

/**
 * BackButtonOverlay - For loading/error states
 */
function BackButtonOverlay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.backOverlay, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

/**
 * MihonReaderContainer - Data fetching, store initialization, chapter management.
 * Matches Mihon's ReaderActivity + ReaderViewModel.
 */
export function MihonReaderContainer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Parse route params
  const {
    chapterId,
    sourceId,
    url,
    mangaUrl,
    mangaId,
    mangaTitle,
    mangaCover,
    chapterNumber: chapterNumberParam,
    chapterTitle: chapterTitleParam,
  } = useLocalSearchParams<{
    chapterId: string;
    sourceId: string;
    url: string;
    mangaUrl: string;
    mangaId?: string;
    mangaTitle?: string;
    mangaCover?: string;
    chapterNumber?: string;
    chapterTitle?: string;
  }>();

  // Store state & actions
  const isInitialized = useViewerStore((s) => s.isInitialized);
  const viewerChapters = useViewerStore((s) => s.viewerChapters);
  const init = useViewerStore((s) => s.init);
  const reset = useViewerStore((s) => s.reset);
  const setViewerChapters = useViewerStore((s) => s.setViewerChapters);
  const updateChapterState = useViewerStore((s) => s.updateChapterState);

  // Hooks
  const { loadChapter, retryChapter } = useChapterLoader();
  const { preloadChapter, preloadAdjacent } = usePreloader();

  // Refs
  const hasInitializedRef = useRef(false);

  // Get source
  const source = getSource(sourceId || "");

  // Fetch chapter list
  const { data: chapters } = useChapterList(sourceId || "", mangaUrl || "");

  // Fetch initial chapter pages
  const {
    data: initialPages,
    isLoading: pagesLoading,
    error: pagesError,
  } = useQuery({
    queryKey: ["pages", sourceId, url],
    queryFn: async () => {
      if (!source) throw new Error(`Source ${sourceId} not found`);
      return source.getPageList(url || "");
    },
    enabled: !!source && !!url,
    staleTime: 10 * 60 * 1000,
  });

  // Find current chapter info
  const currentChapter =
    chapters?.find((ch) => ch.url === url) ??
    (chapterNumberParam
      ? ({
          id: chapterId || "",
          mangaId: mangaId || "",
          url: url || "",
          number: parseFloat(chapterNumberParam),
          title: chapterTitleParam,
        } as Chapter)
      : undefined);

  const currentChapterIndex = chapters?.findIndex((ch) => ch.url === url) ?? -1;

  // Initialize store when data is ready
  useEffect(() => {
    if (
      !hasInitializedRef.current &&
      initialPages &&
      initialPages.length > 0 &&
      currentChapter
    ) {
      hasInitializedRef.current = true;

      // Create ReaderChapter for current
      const currReaderChapter = createReaderChapter(currentChapter, 0);
      const currPages = createReaderPages(initialPages, currentChapter.id);
      currReaderChapter.state = { status: "loaded", pages: currPages };

      // Create ReaderChapters for prev/next (if available)
      let prevReaderChapter: ReaderChapter | null = null;
      let nextReaderChapter: ReaderChapter | null = null;

      if (chapters && currentChapterIndex >= 0) {
        // Prev chapter (higher index = earlier chapter)
        const prevChapter = chapters[currentChapterIndex + 1];
        if (prevChapter) {
          prevReaderChapter = createReaderChapter(prevChapter);
        }

        // Next chapter (lower index = later chapter)
        const nextChapter = chapters[currentChapterIndex - 1];
        if (nextChapter) {
          nextReaderChapter = createReaderChapter(nextChapter);
        }
      }

      const viewerChapters: ViewerChapters = {
        prev: prevReaderChapter,
        curr: currReaderChapter,
        next: nextReaderChapter,
      };

      console.log("[MihonReaderContainer] Initializing with:", {
        curr: currReaderChapter.chapter.id,
        currPages: currPages.length,
        prev: prevReaderChapter?.chapter.id,
        next: nextReaderChapter?.chapter.id,
      });

      init({
        mangaId: mangaId || "",
        sourceId: sourceId || "",
        mangaTitle: mangaTitle || "",
        mangaUrl: mangaUrl || "",
        viewerChapters,
      });

      // Preload adjacent chapters after init
      setTimeout(() => {
        if (prevReaderChapter) {
          preloadChapter(prevReaderChapter);
        }
        if (nextReaderChapter) {
          preloadChapter(nextReaderChapter);
        }
      }, 500);
    }
  }, [
    initialPages,
    currentChapter,
    chapters,
    currentChapterIndex,
    mangaId,
    sourceId,
    mangaTitle,
    mangaUrl,
    init,
    preloadChapter,
  ]);

  // Reset store on unmount
  useEffect(() => {
    return () => {
      reset();
      hasInitializedRef.current = false;
    };
  }, [reset]);

  // === Callbacks for WebtoonViewer ===

  /**
   * Called when the user scrolls into a different chapter's pages.
   * This should update the ViewerChapters window to make that chapter "current".
   */
  const handleChapterChange = useCallback(
    (newChapter: ReaderChapter) => {
      if (!viewerChapters || !chapters) return;

      const newChapterId = newChapter.chapter.id;
      const newChapterIndex = chapters.findIndex(
        (ch) => ch.id === newChapterId
      );

      if (newChapterIndex < 0) return;

      console.log(
        "[MihonReaderContainer] Chapter change:",
        viewerChapters.curr.chapter.id,
        "->",
        newChapterId
      );

      // Build new ViewerChapters window
      const prevChapter = chapters[newChapterIndex + 1];
      const nextChapter = chapters[newChapterIndex - 1];

      // Reuse existing ReaderChapter objects if they match
      const findExisting = (id: string): ReaderChapter | null => {
        if (viewerChapters.prev?.chapter.id === id) return viewerChapters.prev;
        if (viewerChapters.curr.chapter.id === id) return viewerChapters.curr;
        if (viewerChapters.next?.chapter.id === id) return viewerChapters.next;
        return null;
      };

      const newViewerChapters: ViewerChapters = {
        prev: prevChapter
          ? findExisting(prevChapter.id) ?? createReaderChapter(prevChapter)
          : null,
        curr: findExisting(newChapterId) ?? newChapter,
        next: nextChapter
          ? findExisting(nextChapter.id) ?? createReaderChapter(nextChapter)
          : null,
      };

      setViewerChapters(newViewerChapters);

      // Preload new adjacent chapters
      if (newViewerChapters.prev?.state.status === "wait") {
        preloadChapter(newViewerChapters.prev);
      }
      if (newViewerChapters.next?.state.status === "wait") {
        preloadChapter(newViewerChapters.next);
      }
    },
    [viewerChapters, chapters, setViewerChapters, preloadChapter]
  );

  /**
   * Called when viewer indicates a chapter needs preloading.
   */
  const handlePreloadNeeded = useCallback(
    (chapter: ReaderChapter) => {
      preloadChapter(chapter);
    },
    [preloadChapter]
  );

  /**
   * Called when user taps retry on a transition.
   */
  const handleRetryChapter = useCallback(
    (chapter: ReaderChapter) => {
      retryChapter(chapter);
    },
    [retryChapter]
  );

  /**
   * Called when user seeks to a page via slider.
   */
  const handleSeekPage = useCallback((page: number) => {
    // TODO: Implement scroll to page
    console.log("[MihonReaderContainer] Seek to page:", page);
  }, []);

  // === Render States ===

  // Loading
  if (pagesLoading) {
    return (
      <View style={styles.centerContainer}>
        <BackButtonOverlay />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading chapter...</Text>
      </View>
    );
  }

  // Error
  if (pagesError || !initialPages || initialPages.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <BackButtonOverlay />
        <Text style={styles.errorText}>Failed to load pages</Text>
        <Text style={styles.errorSubtext}>
          {(pagesError as Error)?.message || "No pages found"}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.goBackButton}>
          <Text style={styles.goBackText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Waiting for initialization
  if (!isInitialized) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  // Main reader
  return (
    <View style={styles.container}>
      <WebtoonViewer
        onChapterChange={handleChapterChange}
        onPreloadNeeded={handlePreloadNeeded}
        onRetryChapter={handleRetryChapter}
      />
      <ReaderOverlay
        chapterTitle={
          currentChapter?.title || `Chapter ${currentChapter?.number}`
        }
        onSeekPage={handleSeekPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  loadingText: {
    color: "#71717a",
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "600",
  },
  errorSubtext: {
    color: "#71717a",
    marginTop: 8,
    textAlign: "center",
  },
  goBackButton: {
    marginTop: 24,
    backgroundColor: "#27272a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackText: {
    color: "#fff",
    fontSize: 16,
  },
});
