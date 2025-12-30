import { useCallback, useRef, useMemo, memo, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LegendList } from "@legendapp/list";
import { PageHolder } from "./PageHolder";
import { TransitionHolder } from "./TransitionHolder";
import { HoldProgressIndicator } from "./HoldProgressIndicator";
import { useViewerAdapter } from "../hooks/useViewerAdapter";
import {
  usePageTracking,
  type PageTrackingCallbacks,
} from "../hooks/usePageTracking";
import { useViewerStore } from "../store/viewer.store";
import { getItemKey, findInitialScrollIndex } from "../utils";
import type { AdapterItem, ReaderChapter } from "../models";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Threshold before we consider user has intentionally scrolled
const SCROLL_ACTIVATION_THRESHOLD = 100;

interface WebtoonViewerProps {
  onChapterChange: (chapter: ReaderChapter) => void;
  onPreloadNeeded: (chapter: ReaderChapter) => void;
  onRetryChapter: (chapter: ReaderChapter) => void;
  onGoToChapter: (chapter: ReaderChapter) => void;
  onMarkChapterRead?: (chapter: ReaderChapter, totalPages: number) => void;
}

/**
 * WebtoonViewer - Main virtualized list for the reader.
 * Matches Mihon's WebtoonViewer with WebtoonRecyclerView.
 */
function WebtoonViewerComponent({
  onChapterChange,
  onPreloadNeeded,
  onRetryChapter,
  onGoToChapter,
  onMarkChapterRead,
}: WebtoonViewerProps) {
  const listRef = useRef<any>(null);

  // Scroll activation tracking - prevents page updates until user intentionally scrolls
  const hasUserScrolledRef = useRef(false);
  const initialScrollOffsetRef = useRef<number | null>(null);
  const lastReportedPageRef = useRef<{ page: number; chapterId: string }>({
    page: 0,
    chapterId: "",
  });

  // Build items from viewerChapters
  const items = useViewerAdapter();

  // Store state
  const viewerChapters = useViewerStore((s) => s.viewerChapters);
  const toggleMenu = useViewerStore((s) => s.toggleMenu);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);

  // Page tracking
  const trackingCallbacks: PageTrackingCallbacks = useMemo(
    () => ({
      onChapterChange,
      onPreloadNeeded,
      onMarkChapterRead,
    }),
    [onChapterChange, onPreloadNeeded, onMarkChapterRead]
  );

  const { handleViewableItemsChanged, handleScroll } = usePageTracking(
    items,
    trackingCallbacks
  );

  // Calculate initial scroll index
  const initialScrollIndex = useMemo(() => {
    if (!viewerChapters || items.length === 0) return 0;

    return findInitialScrollIndex(
      items,
      viewerChapters.curr.chapter.id,
      viewerChapters.curr.requestedPage
    );
  }, [items, viewerChapters]);

  // Set initial page correctly on mount
  useEffect(() => {
    if (viewerChapters && items.length > 0) {
      const currPages =
        viewerChapters.curr.state.status === "loaded"
          ? viewerChapters.curr.state.pages
          : [];
      const totalPages = currPages.length;
      const initialPage = viewerChapters.curr.requestedPage + 1 || 1;

      // Set initial page
      setCurrentPage(initialPage, totalPages);
      lastReportedPageRef.current = {
        page: initialPage,
        chapterId: viewerChapters.curr.chapter.id,
      };
    }
  }, [viewerChapters?.curr.chapter.id]); // Only on chapter change

  // Track previous chapter ID to detect chapter switches
  const prevChapterIdRef = useRef<string | null>(null);

  // Scroll to first page when current chapter changes (for Load Chapter button)
  useEffect(() => {
    const currChapterId = viewerChapters?.curr.chapter.id;

    // Skip initial mount
    if (prevChapterIdRef.current === null) {
      prevChapterIdRef.current = currChapterId ?? null;
      return;
    }

    // Detect chapter change
    if (currChapterId && currChapterId !== prevChapterIdRef.current) {
      console.log(
        "[WebtoonViewer] Chapter changed, scrolling to start:",
        currChapterId
      );
      prevChapterIdRef.current = currChapterId;

      // Scroll to the first page of new chapter (index 1 is first page after prev transition)
      if (listRef.current && items.length > 1) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index: 1, animated: false });
        }, 100);
      }
    }
  }, [viewerChapters?.curr.chapter.id, items.length]);

  // Reset scroll tracking when items change
  useEffect(() => {
    hasUserScrolledRef.current = false;
    initialScrollOffsetRef.current = null;
  }, [items.length]);

  // Handle tap on page/transition
  const handleTap = useCallback(() => {
    toggleMenu();
  }, [toggleMenu]);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: AdapterItem }) => {
      if (item.type === "page") {
        return <PageHolder page={item} onTap={handleTap} />;
      }
      // For transitions, use onGoToChapter for loading, onRetryChapter for errors
      const handleLoadChapter = item.to
        ? () => {
            if (item.to!.state.status === "error") {
              onRetryChapter(item.to!);
            } else {
              onGoToChapter(item.to!);
            }
          }
        : undefined;
      return (
        <TransitionHolder
          transition={item}
          onTap={handleTap}
          onLoadChapter={handleLoadChapter}
        />
      );
    },
    [handleTap, onRetryChapter, onGoToChapter]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: AdapterItem, index: number) => getItemKey(item, index),
    []
  );

  // Pull-and-hold gesture state (bottom - next chapter)
  const overscrollBottomRef = useRef(0);
  const holdBottomTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdBottomStartTimeRef = useRef<number | null>(null);
  const holdBottomTriggeredRef = useRef(false);
  const [holdBottomProgress, setHoldBottomProgress] = useState(0);
  const progressBottomIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pull-and-hold gesture state (top - prev chapter)
  const overscrollTopRef = useRef(0);
  const holdTopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTopStartTimeRef = useRef<number | null>(null);
  const holdTopTriggeredRef = useRef(false);
  const [holdTopProgress, setHoldTopProgress] = useState(0);
  const progressTopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const OVERSCROLL_THRESHOLD = 150;
  const HOLD_DURATION = 1000; // 1 second

  // Scroll handler
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;
      const offsetY = contentOffset.y;
      const layoutHeight = layoutMeasurement.height;
      const contentHeight = contentSize.height;

      // Track scroll position for menu hiding
      handleScroll(event);

      // First scroll - initialize tracking
      if (initialScrollOffsetRef.current === null) {
        initialScrollOffsetRef.current = offsetY;
      }

      // Detect if user has scrolled past threshold
      if (initialScrollOffsetRef.current !== null) {
        const scrollDelta = Math.abs(offsetY - initialScrollOffsetRef.current);
        if (scrollDelta > SCROLL_ACTIVATION_THRESHOLD) {
          hasUserScrolledRef.current = true;
        }
      }

      // === Top overscroll detection (prev chapter) ===
      const overscrollTop = Math.abs(Math.min(0, offsetY)); // Negative = above top
      overscrollTopRef.current = overscrollTop;

      if (
        overscrollTop >= OVERSCROLL_THRESHOLD &&
        !holdTopTriggeredRef.current
      ) {
        if (!holdTopTimerRef.current) {
          console.log("[WebtoonViewer] Top hold timer started");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          holdTopStartTimeRef.current = Date.now();
          setHoldTopProgress(0);

          progressTopIntervalRef.current = setInterval(() => {
            if (holdTopStartTimeRef.current) {
              const elapsed = Date.now() - holdTopStartTimeRef.current;
              const progress = Math.min(elapsed / HOLD_DURATION, 1);
              setHoldTopProgress(progress);
            }
          }, 50);

          holdTopTimerRef.current = setTimeout(() => {
            const prevChapter = viewerChapters?.prev;
            if (
              prevChapter &&
              (prevChapter.state.status === "wait" ||
                prevChapter.state.status === "loaded")
            ) {
              console.log(
                "[WebtoonViewer] Top hold complete, loading prev chapter"
              );
              holdTopTriggeredRef.current = true;
              onGoToChapter(prevChapter);
            }
            holdTopTimerRef.current = null;
            if (progressTopIntervalRef.current) {
              clearInterval(progressTopIntervalRef.current);
              progressTopIntervalRef.current = null;
            }
            setHoldTopProgress(0);
          }, HOLD_DURATION);
        }
      } else {
        if (holdTopTimerRef.current) {
          console.log("[WebtoonViewer] Top hold cancelled");
          clearTimeout(holdTopTimerRef.current);
          holdTopTimerRef.current = null;
          holdTopStartTimeRef.current = null;
        }
        if (progressTopIntervalRef.current) {
          clearInterval(progressTopIntervalRef.current);
          progressTopIntervalRef.current = null;
        }
        setHoldTopProgress(0);
        if (overscrollTop < 50) {
          holdTopTriggeredRef.current = false;
        }
      }

      // === Bottom overscroll detection (next chapter) ===
      const maxScroll = contentHeight - layoutHeight;
      const overscroll = offsetY - maxScroll;
      overscrollBottomRef.current = Math.max(0, overscroll);

      // Check if user has pulled past threshold
      if (
        overscrollBottomRef.current >= OVERSCROLL_THRESHOLD &&
        !holdBottomTriggeredRef.current
      ) {
        // User is pulling past threshold - start hold timer if not already started
        if (!holdBottomTimerRef.current) {
          console.log("[WebtoonViewer] Bottom hold timer started");
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          holdBottomStartTimeRef.current = Date.now();
          setHoldBottomProgress(0);

          // Update progress every 50ms
          progressBottomIntervalRef.current = setInterval(() => {
            if (holdBottomStartTimeRef.current) {
              const elapsed = Date.now() - holdBottomStartTimeRef.current;
              const progress = Math.min(elapsed / HOLD_DURATION, 1);
              setHoldBottomProgress(progress);
            }
          }, 50);

          holdBottomTimerRef.current = setTimeout(() => {
            const nextChapter = viewerChapters?.next;
            if (
              nextChapter &&
              (nextChapter.state.status === "wait" ||
                nextChapter.state.status === "loaded")
            ) {
              console.log(
                "[WebtoonViewer] Bottom hold complete, loading next chapter"
              );
              holdBottomTriggeredRef.current = true;
              onGoToChapter(nextChapter);
            }
            holdBottomTimerRef.current = null;
            if (progressBottomIntervalRef.current) {
              clearInterval(progressBottomIntervalRef.current);
              progressBottomIntervalRef.current = null;
            }
            setHoldBottomProgress(0);
          }, HOLD_DURATION);
        }
      } else {
        // User released or didn't pull far enough - cancel timer
        if (holdBottomTimerRef.current) {
          console.log("[WebtoonViewer] Bottom hold cancelled");
          clearTimeout(holdBottomTimerRef.current);
          holdBottomTimerRef.current = null;
          holdBottomStartTimeRef.current = null;
        }
        if (progressBottomIntervalRef.current) {
          clearInterval(progressBottomIntervalRef.current);
          progressBottomIntervalRef.current = null;
        }
        setHoldBottomProgress(0);
        // Reset trigger when user scrolls back up
        if (overscrollBottomRef.current < 50) {
          holdBottomTriggeredRef.current = false;
        }
      }

      // Skip page tracking if user hasn't scrolled intentionally
      if (!hasUserScrolledRef.current) {
        return;
      }

      // Calculate which item is at the center of the viewport
      if (items.length === 0 || contentHeight === 0) return;

      // Use center of viewport for page detection
      const viewportCenter = offsetY + layoutHeight * 0.3;
      const avgItemHeight = contentHeight / items.length;
      const centerIndex = Math.floor(viewportCenter / avgItemHeight);
      const clampedIndex = Math.max(0, Math.min(centerIndex, items.length - 1));

      const currentItem = items[clampedIndex];
      if (!currentItem) return;

      // Only update if it's a page and different from last reported
      if (currentItem.type === "page") {
        const pageNum = currentItem.index + 1;
        const chapterId = currentItem.chapterId;

        // Find total pages for this chapter
        let totalPages = 0;
        if (viewerChapters) {
          let chapter = null;
          if (viewerChapters.prev?.chapter.id === chapterId) {
            chapter = viewerChapters.prev;
          } else if (viewerChapters.curr.chapter.id === chapterId) {
            chapter = viewerChapters.curr;
          } else if (viewerChapters.next?.chapter.id === chapterId) {
            chapter = viewerChapters.next;
          }
          if (chapter?.state.status === "loaded") {
            totalPages = chapter.state.pages.length;
          }
        }

        // Only update if changed
        if (
          pageNum !== lastReportedPageRef.current.page ||
          chapterId !== lastReportedPageRef.current.chapterId
        ) {
          lastReportedPageRef.current = { page: pageNum, chapterId };
          setCurrentPage(pageNum, totalPages);

          // Also trigger viewable items changed for chapter tracking
          handleViewableItemsChanged({
            viewableItems: [{ item: currentItem, index: clampedIndex }],
          });
        }
      }
    },
    [
      items,
      viewerChapters,
      handleViewableItemsChanged,
      handleScroll,
      setCurrentPage,
      onGoToChapter,
    ]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdTopTimerRef.current) {
        clearTimeout(holdTopTimerRef.current);
      }
      if (progressTopIntervalRef.current) {
        clearInterval(progressTopIntervalRef.current);
      }
      if (holdBottomTimerRef.current) {
        clearTimeout(holdBottomTimerRef.current);
      }
      if (progressBottomIntervalRef.current) {
        clearInterval(progressBottomIntervalRef.current);
      }
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LegendList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={SCREEN_HEIGHT * 0.8}
        initialScrollIndex={
          initialScrollIndex > 0 ? initialScrollIndex : undefined
        }
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        drawDistance={SCREEN_HEIGHT}
        maintainVisibleContentPosition
      />

      {/* Top progress indicator overlay (appears on pull-down) */}
      {holdTopProgress > 0 && (
        <View style={styles.topProgressOverlay}>
          <HoldProgressIndicator progress={holdTopProgress} size={60} />
        </View>
      )}

      {/* Bottom progress indicator overlay (appears on pull-up) */}
      {holdBottomProgress > 0 && (
        <View style={styles.bottomProgressOverlay}>
          <HoldProgressIndicator progress={holdBottomProgress} size={60} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topProgressOverlay: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  bottomProgressOverlay: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
});

export const WebtoonViewer = memo(WebtoonViewerComponent);
