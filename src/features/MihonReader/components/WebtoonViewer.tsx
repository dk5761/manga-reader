import { useCallback, useRef, memo, useMemo } from "react";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const lastViewedIndexRef = useRef(0);

  // Build items from viewerChapters
  const items = useViewerAdapter();

  // Store state
  const viewerChapters = useViewerStore((s) => s.viewerChapters);
  const toggleMenu = useViewerStore((s) => s.toggleMenu);

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

  // Handle scroll events - track viewable items manually
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll(event);

      // Approximate which item is visible based on scroll position
      const offsetY = event.nativeEvent.contentOffset.y;
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      const avgItemHeight = SCREEN_HEIGHT * 0.8;

      // Calculate visible range
      const firstVisibleIndex = Math.floor(offsetY / avgItemHeight);
      const lastVisibleIndex = Math.ceil(
        (offsetY + layoutHeight) / avgItemHeight
      );

      // If changed, trigger viewable items callback
      if (lastVisibleIndex !== lastViewedIndexRef.current && items.length > 0) {
        lastViewedIndexRef.current = lastVisibleIndex;

        const viewableItems = [];
        for (
          let i = Math.max(0, firstVisibleIndex);
          i <= Math.min(lastVisibleIndex, items.length - 1);
          i++
        ) {
          viewableItems.push({ item: items[i], index: i });
        }

        if (viewableItems.length > 0) {
          handleViewableItemsChanged({ viewableItems });
        }
      }
    },
    [handleScroll, handleViewableItemsChanged, items]
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
