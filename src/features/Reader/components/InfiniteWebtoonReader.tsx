/**
 * InfiniteWebtoonReader
 * Simplified vertical scrolling reader that renders ReaderItem[].
 */

import { useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { Dimensions, StatusBar, View } from "react-native";
import { LegendList } from "@legendapp/list";

// Components
import { WebViewZoomableImage } from "./WebViewZoomableImage";
import { ChapterTransition } from "./ChapterTransition";

// Store
import { useInfiniteReaderStore } from "../store/useInfiniteReaderStore";

// Hooks
import { useImagePreloader } from "../hooks/useImagePreloader";
import {
  useVisibleChapterTracker,
  calculatePageNumber,
} from "../hooks/useVisibleChapterTracker";

// Types
import {
  getReaderItemKey,
  READER_CONFIG,
  type ReaderItem,
  type PageItem,
} from "../types/infinite-reader.types";
import type { Page } from "@/sources";

// Utils
import { readerLog } from "../utils/reader-logger";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRELOAD_COUNT = 5;

// ============================================================================
// Types
// ============================================================================

interface InfiniteWebtoonReaderProps {
  items: ReaderItem[];
  baseUrl?: string;
  initialScrollIndex?: number;
  onTap?: () => void;
  paddingBottom?: number;
}

export interface InfiniteWebtoonReaderHandle {
  scrollToIndex: (index: number, animated?: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

export const InfiniteWebtoonReader = forwardRef<
  InfiniteWebtoonReaderHandle,
  InfiniteWebtoonReaderProps
>(function InfiniteWebtoonReader(
  { items, baseUrl, initialScrollIndex = 0, onTap, paddingBottom = 0 },
  ref
) {
  const listRef = useRef<any>(null);
  const lastReportedIndexRef = useRef(-1);

  // Get page items for preloading
  const pageItems = items.filter((i): i is PageItem => i.type === "page");
  const pages: Page[] = pageItems.map((p) => p.page);
  const currentPage = useInfiniteReaderStore((s) => s.currentPage);

  // Preload images
  useImagePreloader(pages, currentPage, PRELOAD_COUNT, baseUrl);

  // Visibility tracker
  const { processVisibleIndex } = useVisibleChapterTracker({
    items,
    enabled: true,
  });

  // Expose scroll methods
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, animated = true) => {
      listRef.current?.scrollToIndex({
        index: Math.max(0, Math.min(index, items.length - 1)),
        animated,
        viewPosition: 0,
      });
    },
  }));

  // =========================================================================
  // Scroll Handler
  // =========================================================================
  const handleScroll = useCallback(
    (event: any) => {
      if (useInfiniteReaderStore.getState().isSliderDragging) {
        return;
      }

      const offsetY = event.nativeEvent.contentOffset.y;
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      const contentHeight = event.nativeEvent.contentSize.height;

      if (items.length === 0 || contentHeight === 0) return;

      // Calculate visible index
      const avgItemHeight = contentHeight / items.length;
      const midPoint = offsetY + layoutHeight / 2;
      const visibleIndex = Math.floor(midPoint / avgItemHeight);

      // Only process if changed
      if (visibleIndex !== lastReportedIndexRef.current) {
        lastReportedIndexRef.current = visibleIndex;

        // Update page/chapter tracking
        const pageInfo = calculatePageNumber(items, visibleIndex);
        if (pageInfo) {
          // Get the actual page item to track chapter
          const item = items[visibleIndex];
          if (item?.type === "page") {
            const chapterIndex = useInfiniteReaderStore
              .getState()
              .chapters.findIndex((c) => c.id === item.chapterId);

            if (chapterIndex >= 0) {
              const store = useInfiniteReaderStore.getState();
              if (item.chapterId !== store.currentChapterId) {
                readerLog.chapter.info("Chapter changed via scroll", {
                  from: store.currentChapterId,
                  to: item.chapterId,
                });
                store.setCurrentChapter(item.chapterId, chapterIndex);
              }
              store.setCurrentPage(pageInfo.pageNumber);
            }
          }
        }
      }
    },
    [items]
  );

  // =========================================================================
  // Render Item
  // =========================================================================
  const renderItem = useCallback(
    ({ item }: { item: ReaderItem }) => {
      if (item.type === "transition") {
        return <ChapterTransition item={item} onTap={onTap} />;
      }

      return (
        <WebViewZoomableImage
          uri={item.page.imageUrl}
          baseUrl={baseUrl}
          width={SCREEN_WIDTH}
          minHeight={100}
          onTap={onTap}
        />
      );
    },
    [baseUrl, onTap]
  );

  // =========================================================================
  // Key Extractor
  // =========================================================================
  const keyExtractor = useCallback(
    (item: ReaderItem, index: number) => getReaderItemKey(item, index),
    []
  );

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      <LegendList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialScrollIndex={
          initialScrollIndex > 0 ? initialScrollIndex : undefined
        }
        estimatedItemSize={SCREEN_WIDTH * 1.5}
        maintainVisibleContentPosition
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom }}
        decelerationRate={0.992}
        drawDistance={SCREEN_WIDTH * 2}
      />
    </View>
  );
});
