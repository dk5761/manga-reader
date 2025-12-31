import { Image } from "expo-image";

/**
 * Image cache management utilities for expo-image.
 * Provides functions to clear memory and disk cache.
 */

/**
 * Clear all images from memory cache.
 * Frees up RAM but images will need to be reloaded from disk cache or network.
 */
export async function clearMemoryCache(): Promise<void> {
  try {
    await Image.clearMemoryCache();
    console.log("[ImageCache] Memory cache cleared");
  } catch (error) {
    console.error("[ImageCache] Failed to clear memory cache:", error);
    throw error;
  }
}

/**
 * Clear all images from disk cache.
 * Images will need to be re-downloaded from network.
 */
export async function clearDiskCache(): Promise<void> {
  try {
    await Image.clearDiskCache();
    console.log("[ImageCache] Disk cache cleared");
  } catch (error) {
    console.error("[ImageCache] Failed to clear disk cache:", error);
    throw error;
  }
}

/**
 * Clear both memory and disk cache.
 * Complete cache reset - all images will need to be re-downloaded.
 */
export async function clearAllCache(): Promise<void> {
  try {
    await Promise.all([Image.clearMemoryCache(), Image.clearDiskCache()]);
    console.log("[ImageCache] All caches cleared");
  } catch (error) {
    console.error("[ImageCache] Failed to clear caches:", error);
    throw error;
  }
}

/**
 * Preload images for better reading experience.
 * Images will be cached and ready when needed.
 *
 * @param sources - Array of image URIs or source objects with headers
 */
export function preloadImages(
  sources: Array<{
    uri: string;
    headers?: Record<string, string>;
  }>
): void {
  // expo-image's prefetch handles caching
  for (const source of sources) {
    Image.prefetch(source.uri, {
      headers: source.headers,
    }).catch((error) => {
      console.warn("[ImageCache] Failed to prefetch image:", error);
    });
  }
}
