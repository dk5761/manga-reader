import { MangaKakalotSource } from "./mangakakalot";
import type { Source } from "./base";

// Source instances
const mangakakalot = new MangaKakalotSource();

// Source registry - add new sources here
export const SOURCES: Record<string, Source> = {
  mangakakalot,
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
