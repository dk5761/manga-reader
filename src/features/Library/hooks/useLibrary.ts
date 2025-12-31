import { useCallback, useMemo } from "react";
import { useRealm, useQuery, useObject } from "@realm/react";
import { MangaSchema, ChapterSchema, ReadingStatus } from "@/core/database";
import type { Manga, Chapter } from "@/sources";
import { downloadCover, deleteCover } from "@/core/services/ImageCacheService";

/**
 * Get all manga in library
 * Returns reactive list that auto-updates on changes
 */
export function useLibraryManga() {
  const manga = useQuery(MangaSchema);

  const libraryManga = useMemo(() => {
    return manga.sorted("addedAt", true); // Most recent first
  }, [manga]);

  return libraryManga;
}

/**
 * Get manga filtered by reading status
 */
export function useLibraryByStatus(status: ReadingStatus | "all") {
  const manga = useQuery(MangaSchema);

  const filtered = useMemo(() => {
    if (status === "all") {
      return manga.sorted("addedAt", true);
    }
    return manga
      .filtered("readingStatus == $0", status)
      .sorted("addedAt", true);
  }, [manga, status]);

  return filtered;
}

/**
 * Check if manga is in library
 */
export function useIsInLibrary(sourceId: string, mangaId: string) {
  const id = `${sourceId}_${mangaId}`;
  const manga = useObject(MangaSchema, id);
  return !!manga;
}

/**
 * Get single manga from library with all chapters
 */
export function useLibraryMangaById(id: string) {
  return useObject(MangaSchema, id);
}

/**
 * Add manga to library with chapters
 */
export function useAddToLibrary() {
  const realm = useRealm();

  return useCallback(
    async (manga: Manga, chapters: Chapter[], sourceId: string) => {
      const id = `${sourceId}_${manga.id}`;

      realm.write(() => {
        // Check if already exists
        const existing = realm.objectForPrimaryKey(MangaSchema, id);
        if (existing) {
          console.log("[Library] Manga already in library:", id);
          return;
        }

        realm.create(MangaSchema, {
          id,
          sourceId,
          title: manga.title,
          cover: manga.cover,
          url: manga.url,
          author: manga.author,
          artist: manga.artist,
          status: manga.status,
          description: manga.description,
          genres: manga.genres || [],
          chapters: chapters.map((ch) => ({
            id: ch.id,
            number: ch.number,
            title: ch.title,
            url: ch.url,
            date: ch.date,
            isRead: false,
            lastPageRead: 0,
          })),
          readingStatus: "reading",
          addedAt: Date.now(),
        });

        console.log("[Library] Added manga:", manga.title);
      });

      // Background cover download
      if (manga.cover) {
        const localPath = await downloadCover(manga.cover, id);
        if (localPath) {
          realm.write(() => {
            const addedManga = realm.objectForPrimaryKey(MangaSchema, id);
            if (addedManga) {
              addedManga.localCover = localPath;
            }
          });
        }
      }
    },
    [realm]
  );
}

/**
 * Remove manga from library
 */
export function useRemoveFromLibrary() {
  const realm = useRealm();

  return useCallback(
    (id: string) => {
      // Background cover deletion
      deleteCover(id);

      realm.write(() => {
        const manga = realm.objectForPrimaryKey(MangaSchema, id);
        if (manga) {
          realm.delete(manga);
          console.log("[Library] Removed manga:", id);
        }
      });
    },
    [realm]
  );
}

/**
 * Update reading status
 */
export function useUpdateReadingStatus() {
  const realm = useRealm();

  return useCallback(
    (id: string, status: ReadingStatus) => {
      realm.write(() => {
        const manga = realm.objectForPrimaryKey(MangaSchema, id);
        if (manga) {
          manga.readingStatus = status;
          console.log("[Library] Updated status:", id, status);
        }
      });
    },
    [realm]
  );
}

/**
 * Update chapters in library (for checking updates)
 */
export function useUpdateLibraryChapters() {
  const realm = useRealm();

  return useCallback(
    (id: string, newChapters: Chapter[]) => {
      console.log("[DEBUG useUpdateLibraryChapters] CALLED with:", {
        mangaId: id,
        newChapterCount: newChapters.length,
      });

      realm.write(() => {
        const manga = realm.objectForPrimaryKey(MangaSchema, id);
        if (!manga) return;

        // Find chapters that don't exist yet
        const existingIds = new Set(manga.chapters.map((c) => c.id));
        const chaptersToAdd = newChapters.filter(
          (ch) => !existingIds.has(ch.id)
        );

        if (chaptersToAdd.length > 0) {
          // Add new chapters
          chaptersToAdd.forEach((ch) => {
            manga.chapters.push({
              id: ch.id,
              number: ch.number,
              title: ch.title,
              url: ch.url,
              date: ch.date,
              isRead: false,
              lastPageRead: 0,
            } as ChapterSchema);
          });

          manga.lastUpdated = Date.now();
          console.log(
            "[Library] Added",
            chaptersToAdd.length,
            "new chapters to",
            manga.title
          );
        }
      });
    },
    [realm]
  );
}
