import { useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { LegendList } from "@legendapp/list";
import { WebViewZoomableImage } from "./WebViewZoomableImage";
import type { Page } from "@/sources";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type WebtoonReaderProps = {
  pages: Page[];
  baseUrl?: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onTap?: () => void;
  paddingBottom?: number;
};

export type WebtoonReaderHandle = {
  scrollToIndex: (index: number, animated?: boolean) => void;
  scrollTo: (options: { y: number; animated?: boolean }) => void;
};

export const WebtoonReader = forwardRef<
  WebtoonReaderHandle,
  WebtoonReaderProps
>(function WebtoonReader(
  { pages, baseUrl, initialPage = 1, onPageChange, onTap, paddingBottom = 0 },
  ref
) {
  const listRef = useRef<any>(null);
  const lastReportedPage = useRef(initialPage);

  // Store onPageChange in a ref so the scroll callback can access it
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  // Expose scroll methods to parent
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, animated = true) => {
      listRef.current?.scrollToIndex({
        index: Math.max(0, Math.min(index, pages.length - 1)),
        animated,
        viewPosition: 0,
      });
    },
    scrollTo: (options: { y: number; animated?: boolean }) => {
      listRef.current?.scrollToOffset({
        offset: options.y,
        animated: options.animated ?? true,
      });
    },
  }));

  // Calculate current page from scroll position
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      const contentHeight = event.nativeEvent.contentSize.height;

      // Calculate page based on scroll position
      if (pages.length > 0 && contentHeight > 0) {
        const avgItemHeight = contentHeight / pages.length;
        const midPoint = offsetY + layoutHeight / 2;
        const currentPage = Math.min(
          pages.length,
          Math.max(1, Math.floor(midPoint / avgItemHeight) + 1)
        );

        if (currentPage !== lastReportedPage.current) {
          lastReportedPage.current = currentPage;
          if (onPageChangeRef.current) {
            onPageChangeRef.current(currentPage);
          }
        }
      }
    },
    [pages.length]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Page; index: number }) => (
      <WebViewZoomableImage
        uri={item.imageUrl}
        baseUrl={baseUrl}
        width={SCREEN_WIDTH}
        minHeight={100}
        onTap={onTap}
      />
    ),
    [baseUrl, onTap]
  );

  const keyExtractor = useCallback(
    (item: Page, index: number) => `page-${item.index}-${index}`,
    []
  );

  return (
    <LegendList
      ref={listRef}
      data={pages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      initialScrollIndex={initialPage > 1 ? initialPage - 1 : undefined}
      estimatedItemSize={SCREEN_WIDTH * 1.5}
      maintainVisibleContentPosition
      recycleItems
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom }}
      decelerationRate="fast"
      drawDistance={SCREEN_WIDTH * 2}
    />
  );
});
