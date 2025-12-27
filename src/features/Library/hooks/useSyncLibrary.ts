import { useCallback } from "react";
import { useRealm, useQuery } from "@realm/react";
import { MangaSchema, ChapterSchema } from "@/core/database";
import { getSource } from "@/sources";
import { useSession } from "@/shared/contexts/SessionContext";
import { useSyncStore, SyncResult, SyncFailure } from "../stores/useSyncStore";
import { sendSyncCompletionNotification } from "@/shared/services/notifications";

/**
 * Hook to sync all library manga and check for new chapters
 * Groups manga by source for efficient session reuse
 */
export function useSyncLibrary() {
  const realm = useRealm();
  const allManga = useQuery(MangaSchema);
  const { isSessionReady, warmupSession, waitForSession } = useSession();
  const { isSyncing, startSync, setWarmingUp, updateProgress, completeSync } =
    useSyncStore();

  const syncLibrary = useCallback(async () => {
    if (isSyncing) return;

    const mangaList = [...allManga];
    if (mangaList.length === 0) {
      console.log("[Sync] No manga in library");
      return;
    }

    // Group manga by sourceId
    const grouped = new Map<string, typeof mangaList>();
    mangaList.forEach((manga) => {
      const list = grouped.get(manga.sourceId) || [];
      list.push(manga);
      grouped.set(manga.sourceId, list);
    });

    console.log(
      "[Sync] Starting sync for",
      mangaList.length,
      "manga across",
      grouped.size,
      "sources"
    );

    startSync(mangaList.length);

    const result: SyncResult = {
      timestamp: Date.now(),
      updated: 0,
      newChapters: 0,
      failed: [],
      skippedSources: [],
    };

    let processedCount = 0;

    // Process each source
    for (const [sourceId, sourceManga] of grouped) {
      const source = getSource(sourceId);
      if (!source) {
        result.skippedSources.push(`Unknown source: ${sourceId}`);
        processedCount += sourceManga.length;
        continue;
      }

      // Warmup CF session if needed
      if (source.needsCloudflareBypass && !isSessionReady(source.baseUrl)) {
        console.log("[Sync] Warming up session for", source.name);
        setWarmingUp(true, source.name);
        warmupSession(source.baseUrl, true);

        // Wait for session to be ready (30s timeout)
        const isReady = await waitForSession(source.baseUrl, 30000);

        setWarmingUp(false);

        // If still not ready after timeout, skip
        if (!isReady) {
          console.log("[Sync] Warmup timeout for", source.name);
          result.skippedSources.push(source.name);
          processedCount += sourceManga.length;
          continue;
        }

        console.log("[Sync] Session ready for", source.name);
      }

      // Sync each manga in this source
      for (const manga of sourceManga) {
        processedCount++;
        updateProgress(processedCount, source.name, manga.title);

        try {
          // Fetch latest chapters
          const chapters = await source.getChapterList(manga.url);

          // Find new chapters
          const existingIds = new Set(manga.chapters.map((c) => c.id));
          const newChapters = chapters.filter((ch) => !existingIds.has(ch.id));

          if (newChapters.length > 0) {
            // Add new chapters to Realm
            realm.write(() => {
              const realmManga = realm.objectForPrimaryKey(
                MangaSchema,
                manga.id
              );
              if (!realmManga) return;

              newChapters.forEach((ch) => {
                realmManga.chapters.push({
                  id: ch.id,
                  number: ch.number,
                  title: ch.title,
                  url: ch.url,
                  date: ch.date,
                  isRead: false,
                  lastPageRead: 0,
                } as ChapterSchema);
              });

              realmManga.lastUpdated = Date.now();
            });

            result.updated++;
            result.newChapters += newChapters.length;
            console.log(
              "[Sync]",
              manga.title,
              ":",
              newChapters.length,
              "new chapters"
            );
          }
        } catch (error) {
          console.error("[Sync] Failed to sync", manga.title, ":", error);
          result.failed.push({
            mangaId: manga.id,
            mangaTitle: manga.title,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    completeSync(result);
    console.log("[Sync] Complete:", result);

    // Send local notification
    try {
      await sendSyncCompletionNotification(result);
    } catch (e) {
      console.warn("[Sync] Failed to send notification:", e);
    }

    return result;
  }, [
    allManga,
    isSyncing,
    isSessionReady,
    realm,
    startSync,
    updateProgress,
    completeSync,
  ]);

  return {
    syncLibrary,
    isSyncing,
  };
}
