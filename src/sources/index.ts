import { MangaKakalotSource } from "./mangakakalot";
import { KissMangaSource } from "./kissmanga";
import { AsuraScansSource } from "./asurascans";
import type { Source } from "./base";

// Source instances
const mangakakalot = new MangaKakalotSource();
const kissmanga = new KissMangaSource();
const asurascans = new AsuraScansSource();

// Source registry - add new sources here
export const SOURCES: Record<string, Source> = {
  mangakakalot,
  kissmanga,
  asurascans,
} as const;

// Helper to get source by ID
export function getSource(id: string): Source | undefined {
  return SOURCES[id];
}

// Get all available sources
export function getAllSources(): Source[] {
  return Object.values(SOURCES);
}

// Re-export types
export * from "./base/types";
export { Source } from "./base/Source";
