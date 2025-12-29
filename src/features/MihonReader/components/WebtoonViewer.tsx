import { useCallback, useRef, memo, useMemo, useEffect } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { LegendList } from "@legendapp/list";
import { PageHolder } from "./PageHolder";
import { TransitionHolder } from "./TransitionHolder";
import { useViewerAdapter } from "../hooks/useViewerAdapter";
import {
  usePageTracking,
  PageTrackingCallbacks,
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
}

/**
 * WebtoonViewer - Main virtualized list for the reader.
 * Matches Mihon's WebtoonViewer with WebtoonRecyclerView.
 */
function WebtoonViewerComponent({
  onChapterChange,
  onPreloadNeeded,
  onRetryChapter,
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
    }),
    [onChapterChange, onPreloadNeeded]
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

  // Reset scroll tracking when items change
  useEffect(() => {
    hasUserScrolledRef.current = false;
    initialScrollOffsetRef.current = null;
  }, [items.length]);

  // Handle tap on page/transition
  const handleTap = useCallback(() => {
    toggleMenu();
  }, [toggleMenu]);

  // Handle retry for transitions
  const handleRetry = useCallback(
    (transition: AdapterItem) => {
      if (transition.type === "transition" && transition.to) {
        onRetryChapter(transition.to);
      }
    },
    [onRetryChapter]
  );

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: AdapterItem }) => {
      if (item.type === "page") {
        return <PageHolder page={item} onTap={handleTap} />;
      }
      return (
        <TransitionHolder
          transition={item}
          onTap={handleTap}
          onRetry={() => handleRetry(item)}
        />
      );
    },
    [handleTap, handleRetry]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: AdapterItem, index: number) => getItemKey(item, index),
    []
  );

  // Handle scroll events
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll(event);

      const offsetY = event.nativeEvent.contentOffset.y;
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      const contentHeight = event.nativeEvent.contentSize.height;

      // Capture initial scroll position on first scroll event
      if (initialScrollOffsetRef.current === null) {
        initialScrollOffsetRef.current = offsetY;
      }

      // Detect if user has scrolled past threshold
      const scrollDelta = Math.abs(offsetY - initialScrollOffsetRef.current);
      if (scrollDelta > SCROLL_ACTIVATION_THRESHOLD) {
        hasUserScrolledRef.current = true;
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
      handleScroll,
      handleViewableItemsChanged,
      items,
      viewerChapters,
      setCurrentPage,
    ]
  );

  if (items.length === 0) {
    return null;
  }

  return (
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
  );
}

export const WebtoonViewer = memo(WebtoonViewerComponent);
