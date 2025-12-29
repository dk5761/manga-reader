import { useMemo } from "react";
import { useViewerStore } from "../store/viewer.store";
import { buildAdapterItems } from "../utils";
import type { AdapterItem } from "../models";

/**
 * Hook that builds the flat adapter items list from viewerChapters.
 * Matches Mihon's WebtoonAdapter.setChapters() being called.
 */
export function useViewerAdapter(): AdapterItem[] {
  const viewerChapters = useViewerStore((s) => s.viewerChapters);
  const currentItem = useViewerStore((s) => s.currentItem);

  return useMemo(() => {
    if (!viewerChapters) {
      return [];
    }

    // Force transition display if current item is a transition
    const forceTransition = currentItem?.type === "transition";

    const items = buildAdapterItems(viewerChapters, forceTransition);

    console.log("[useViewerAdapter] Built items:", {
      total: items.length,
      pages: items.filter((i) => i.type === "page").length,
      transitions: items.filter((i) => i.type === "transition").length,
      currChapter: viewerChapters.curr.chapter.id,
      prevLoaded: viewerChapters.prev?.state.status === "loaded",
      nextLoaded: viewerChapters.next?.state.status === "loaded",
    });

    return items;
  }, [viewerChapters, currentItem?.type]);
}
