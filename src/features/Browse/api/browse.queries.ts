import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { getSource } from "@/sources";
import type { Manga, SearchResult } from "@/sources";

/**
 * Search manga by query
 */
export function useSearchManga(sourceId: string, query: string) {
  const source = getSource(sourceId);

  return useInfiniteQuery({
    queryKey: ["search", sourceId, query],
    queryFn: async ({ pageParam = 1 }) => {
      if (!source) throw new Error(`Source ${sourceId} not found`);
      if (!query.trim()) return { manga: [], hasNextPage: false };
      return source.search(query, pageParam);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    enabled: !!query.trim() && !!source,
    initialPageParam: 1,
  });
}

/**
 * Get popular manga
 */
export function usePopularManga(sourceId: string) {
  const source = getSource(sourceId);

  return useInfiniteQuery({
    queryKey: ["popular", sourceId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!source) throw new Error(`Source ${sourceId} not found`);
      return source.getPopular(pageParam);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    enabled: !!source,
    initialPageParam: 1,
  });
}

/**
 * Get latest updated manga
 */
export function useLatestManga(sourceId: string) {
  const source = getSource(sourceId);

  return useInfiniteQuery({
    queryKey: ["latest", sourceId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!source) throw new Error(`Source ${sourceId} not found`);
      return source.getLatest(pageParam);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    enabled: !!source,
    initialPageParam: 1,
  });
}

/**
 * Flatten infinite query pages into single array
 */
export function flattenMangaPages(pages: SearchResult[] | undefined): Manga[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.manga);
}
