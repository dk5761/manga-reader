import { useQuery } from "@tanstack/react-query";
import { getSource } from "@/sources";
import type { Page } from "@/sources";

/**
 * Get page list for chapter
 */
export function useChapterPages(sourceId: string, chapterUrl: string) {
  const source = getSource(sourceId);

  return useQuery({
    queryKey: ["pages", sourceId, chapterUrl],
    queryFn: async () => {
      if (!source) throw new Error(`Source ${sourceId} not found`);
      return source.getPageList(chapterUrl);
    },
    enabled: !!source && !!chapterUrl,
    staleTime: 10 * 60 * 1000, // 10 minutes (pages don't change often)
  });
}

/**
 * Prefetch next chapter pages
 */
export function usePrefetchChapterPages(
  sourceId: string,
  chapterUrls: string[]
) {
  // This would be called to prefetch upcoming chapters
  // Implementation depends on QueryClient access
}
