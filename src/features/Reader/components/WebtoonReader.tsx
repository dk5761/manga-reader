import {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { SharedValue } from "react-native-reanimated";
import { WebViewZoomableImage } from "./WebViewZoomableImage";
import type { Page } from "@/sources";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type WebtoonReaderProps = {
  pages: Page[];
  baseUrl?: string;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onTap?: () => void;
  scrollY?: SharedValue<number>;
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
  {
    pages,
    baseUrl,
    initialPage = 1,
    onPageChange,
    onTap,
    scrollY,
    paddingBottom = 0,
  },
  ref
) {
  const flashListRef = useRef<any>(null);
  const lastReportedPage = useRef(initialPage);
  const [contentHeight, setContentHeight] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const scrollAttempts = useRef(0);
  const initialPageAtMount = useRef(initialPage);

  // Scroll to initial page with retry logic
  useEffect(() => {
    if (
      initialPageAtMount.current > 1 &&
      isLayoutReady &&
      pages.length > 0 &&
      scrollAttempts.current < 5
    ) {
      const attemptScroll = () => {
        scrollAttempts.current += 1;
        console.log(
          "[WebtoonReader] Scroll attempt",
          scrollAttempts.current,
          "to page:",
          initialPageAtMount.current
        );

        flashListRef.current?.scrollToIndex({
          index: initialPageAtMount.current - 1,
          animated: false,
          viewPosition: 0,
        });
      };

      // Multiple attempts with increasing delays to catch content loading
      attemptScroll();
      const timer1 = setTimeout(attemptScroll, 100);
      const timer2 = setTimeout(attemptScroll, 300);
      const timer3 = setTimeout(attemptScroll, 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isLayoutReady, pages.length]);

  const handleLayout = useCallback(() => {
    if (!isLayoutReady) {
      setIsLayoutReady(true);
    }
  }, [isLayoutReady]);

  // Store onPageChange in a ref so the scroll callback can access it
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  // Track heights for each page (for accurate scroll calculations)
  const itemHeights = useRef<Map<number, number>>(new Map());

  // Expose scroll methods to parent
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, animated = true) => {
      flashListRef.current?.scrollToIndex({
        index: Math.max(0, Math.min(index, pages.length - 1)),
        animated,
        viewPosition: 0, // Align to top
      });
    },
    scrollTo: (options: { y: number; animated?: boolean }) => {
      flashListRef.current?.scrollToOffset({
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

      if (scrollY) {
        scrollY.value = offsetY;
      }

      // Calculate page based on scroll position
      if (pages.length > 0 && contentHeight > 0) {
        // Average height per item
        const avgItemHeight = contentHeight / pages.length;
        // Current page based on what's in the middle of the screen
        const midPoint = offsetY + layoutHeight / 2;
        const currentPage = Math.min(
          pages.length,
          Math.max(1, Math.floor(midPoint / avgItemHeight) + 1)
        );

        if (currentPage !== lastReportedPage.current) {
          lastReportedPage.current = currentPage;
          console.log(
            "[WebtoonReader] Page changed to:",
            currentPage,
            "of",
            pages.length
          );
          if (onPageChangeRef.current) {
            onPageChangeRef.current(currentPage);
          }
        }
      }
    },
    [scrollY, pages.length, contentHeight]
  );

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => {
      console.log(
        "[WebtoonReader] Content size:",
        w,
        h,
        "pages:",
        pages.length
      );
      setContentHeight(h);
    },
    [pages.length]
  );

  const handleHeightChange = useCallback((index: number, height: number) => {
    itemHeights.current.set(index, height);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Page; index: number }) => (
      <WebViewZoomableImage
        uri={item.imageUrl}
        baseUrl={baseUrl}
        width={SCREEN_WIDTH}
        minHeight={100}
        onTap={onTap}
        onHeightChange={(height) => handleHeightChange(index, height)}
      />
    ),
    [baseUrl, onTap, handleHeightChange]
  );

  const keyExtractor = useCallback(
    (item: Page, index: number) => `page-${item.index}-${index}`,
    []
  );

  return (
    <FlashList
      ref={flashListRef}
      data={pages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      initialScrollIndex={initialPage > 1 ? initialPage - 1 : undefined}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
      onLayout={handleLayout}
      contentContainerStyle={{ paddingBottom }}
      decelerationRate="fast"
      drawDistance={SCREEN_WIDTH * 2}
    />
  );
});
