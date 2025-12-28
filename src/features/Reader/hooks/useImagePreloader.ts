import { useEffect, useRef } from "react";
import { Image } from "expo-image";
import type { Page } from "@/sources";

/**
 * Preload upcoming pages for smoother reading experience.
 * Uses expo-image's prefetch which respects caching.
 *
 * @param pages - All pages in the chapter
 * @param currentPage - Current page number (1-indexed)
 * @param preloadCount - Number of pages to preload ahead (default: 3)
 * @param baseUrl - Optional base URL for referer header
 */
export function useImagePreloader(
  pages: Page[],
  currentPage: number,
  preloadCount = 3,
  baseUrl?: string
) {
  const lastPreloadedRef = useRef<number>(0);

  useEffect(() => {
    // Skip if no pages or same page as last preload
    if (pages.length === 0 || currentPage === lastPreloadedRef.current) {
      return;
    }

    // Only preload when moving forward (reading direction)
    // or when significantly changing position (slider jump)
    const diff = currentPage - lastPreloadedRef.current;
    if (diff < 0 && Math.abs(diff) < 3) {
      return; // Skip backward movement unless it's a big jump
    }

    lastPreloadedRef.current = currentPage;

    // Get next pages to preload (0-indexed)
    const startIdx = currentPage; // currentPage is 1-indexed, so this gets next page
    const endIdx = Math.min(startIdx + preloadCount, pages.length);
    const pagesToPreload = pages.slice(startIdx, endIdx);

    if (pagesToPreload.length === 0) {
      return;
    }

    // Prefetch images using expo-image
    const prefetchPromises = pagesToPreload.map((page) => {
      const uri = page.imageUrl;

      // Add headers if baseUrl is provided (some sources need referer)
      const headers: Record<string, string> = {};
      if (baseUrl) {
        headers["Referer"] = baseUrl;
      }

      return Image.prefetch(uri, { headers }).catch(() => {
        // Silent fail - prefetch is best-effort
      });
    });

    // Fire and forget - we don't await these
    Promise.all(prefetchPromises);
  }, [pages, currentPage, preloadCount, baseUrl]);
}
