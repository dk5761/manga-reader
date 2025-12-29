import { useMemo } from "react";
import { useViewerStore } from "../store/viewer.store";
import { buildAdapterItems } from "../utils";
import type { AdapterItem } from "../models";

/**
 * Hook that builds the flat adapter items list from viewerChapters.
 * Transitions are always shown at chapter boundaries.
 */
export function useViewerAdapter(): AdapterItem[] {
  const viewerChapters = useViewerStore((s) => s.viewerChapters);

  return useMemo(() => {
    if (!viewerChapters) {
      return [];
    }

    const items = buildAdapterItems(viewerChapters);

    console.log("[useViewerAdapter] Built items:", {
      total: items.length,
      pages: items.filter((i) => i.type === "page").length,
      transitions: items.filter((i) => i.type === "transition").length,
      currChapter: viewerChapters.curr.chapter.id,
    });

    return items;
  }, [viewerChapters]);
}
