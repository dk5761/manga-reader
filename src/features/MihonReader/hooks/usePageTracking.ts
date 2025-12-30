import { useCallback, useRef } from "react";
import { useViewerStore } from "../store/viewer.store";
import type { AdapterItem, ReaderChapter, ReaderPage } from "../models";
import { getItemChapterId } from "../utils";

export interface PageTrackingCallbacks {
  /** Called when the active chapter changes */
  onChapterChange: (newChapter: ReaderChapter) => void;
  /** Called when preloading should trigger */
  onPreloadNeeded: (chapter: ReaderChapter) => void;
  /** Called when chapter should be marked as read (95% threshold) */
  onMarkChapterRead?: (chapter: ReaderChapter, totalPages: number) => void;
}

/**
 * Hook for tracking current page/item on scroll.
 * Matches Mihon's WebtoonViewer.onScrolled() logic.
 */
export function usePageTracking(
  items: AdapterItem[],
  callbacks: PageTrackingCallbacks
) {
  const viewerChapters = useViewerStore((s) => s.viewerChapters);
  const setCurrentItem = useViewerStore((s) => s.setCurrentItem);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);
  const setCurrentChapter = useViewerStore((s) => s.setCurrentChapter);
  const hideMenu = useViewerStore((s) => s.hideMenu);
  const menuVisible = useViewerStore((s) => s.menuVisible);

  const currentItemRef = useRef<AdapterItem | null>(null);
  const lastScrollY = useRef(0);
  const scrollThreshold = 50; // Hide menu after N pixels of scroll

  /**
   * Find the chapter that contains a given item.
   */
  const findChapterForItem = useCallback(
    (item: AdapterItem): ReaderChapter | null => {
      if (!viewerChapters) return null;

      const chapterId = getItemChapterId(item);

      if (viewerChapters.prev?.chapter.id === chapterId) {
        return viewerChapters.prev;
      }
      if (viewerChapters.curr.chapter.id === chapterId) {
        return viewerChapters.curr;
      }
      if (viewerChapters.next?.chapter.id === chapterId) {
        return viewerChapters.next;
      }

      return null;
    },
    [viewerChapters]
  );

  /**
   * Called when viewable items change (from onViewableItemsChanged).
   * Mimics Mihon's findLastEndVisibleItemPosition logic.
   */
  const handleViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ item: AdapterItem; index: number }>;
    }) => {
      if (viewableItems.length === 0) return;

      // Get the last visible item (Mihon's findLastEndVisibleItemPosition)
      const lastVisible = viewableItems[viewableItems.length - 1];
      const item = lastVisible.item;

      // Skip if same item
      if (item === currentItemRef.current) return;

      currentItemRef.current = item;
      setCurrentItem(item);

      if (item.type === "page") {
        const chapter = findChapterForItem(item);
        if (!chapter) return;

        const pages =
          chapter.state.status === "loaded" ? chapter.state.pages : [];
        const pageNum = item.index + 1;
        const totalPages = pages.length;

        setCurrentPage(pageNum, totalPages);

        // === Mark as Read Detection (95% threshold) ===
        if (totalPages > 0) {
          const progress = pageNum / totalPages;
          const threshold = 0.95;

          if (progress >= threshold) {
            console.log(
              "[usePageTracking] Chapter 95% complete:",
              chapter.chapter.id,
              `(${pageNum}/${totalPages})`
            );
            callbacks.onMarkChapterRead?.(chapter, totalPages);
          }
        }

        // Note: Preloading disabled - chapter loading is now user-driven
        // User must swipe up or tap button at transition to load next chapter

        // === Chapter Switch Detection ===
        // If the current item's chapter is different from viewerChapters.curr
        const currChapterId = viewerChapters?.curr.chapter.id;
        if (currChapterId && item.chapterId !== currChapterId) {
          console.log(
            "[usePageTracking] Chapter switch:",
            currChapterId,
            "->",
            item.chapterId
          );
          if (chapter) {
            setCurrentChapter(chapter);
            callbacks.onChapterChange(chapter);
          }
        }
      } else {
        // Transition item - could trigger preload of the destination chapter
        if (item.to && item.to.state.status === "wait") {
          console.log(
            "[usePageTracking] On transition, preloading:",
            item.to.chapter.id
          );
          callbacks.onPreloadNeeded(item.to);
        }
      }
    },
    [
      viewerChapters,
      setCurrentItem,
      setCurrentPage,
      setCurrentChapter,
      findChapterForItem,
      callbacks,
    ]
  );

  /**
   * Called on scroll events.
   * Used to hide menu on significant scroll (like Mihon).
   */
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const deltaY = Math.abs(currentY - lastScrollY.current);

      // Hide menu on significant scroll
      if (deltaY > scrollThreshold && menuVisible) {
        hideMenu();
      }

      lastScrollY.current = currentY;
    },
    [menuVisible, hideMenu]
  );

  return {
    handleViewableItemsChanged,
    handleScroll,
  };
}
