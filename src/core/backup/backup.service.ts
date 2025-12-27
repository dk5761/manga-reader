/**
 * Backup and Restore Hooks
 * Uses Realm context to export/import library data
 */

import { useCallback } from "react";
import { useRealm, useQuery } from "@realm/react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  MangaSchema,
  ChapterSchema,
  ReadingHistorySchema,
} from "../database/schema";
import {
  BackupData,
  BackupManga,
  BackupHistoryEntry,
  BACKUP_VERSION,
  APP_VERSION,
} from "./backup.types";

/**
 * Hook providing backup and restore functions
 */
export function useBackup() {
  const realm = useRealm();
  const mangaList = useQuery(MangaSchema);
  const historyList = useQuery(ReadingHistorySchema);

  /**
   * Create a backup of all library data
   */
  const createBackup = useCallback((): BackupData => {
    // Export library manga
    const library: BackupManga[] = mangaList.map((manga) => ({
      id: manga.id,
      sourceId: manga.sourceId,
      title: manga.title,
      cover: manga.cover,
      url: manga.url,
      author: manga.author,
      description: manga.description,
      genres: [...manga.genres],
      readingStatus: manga.readingStatus,
      addedAt: manga.addedAt,
      chapters: manga.chapters.map((ch) => ({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        url: ch.url,
        isRead: ch.isRead,
        lastPageRead: ch.lastPageRead,
      })),
      progress: manga.progress
        ? {
            lastChapterId: manga.progress.lastChapterId,
            lastChapterNumber: manga.progress.lastChapterNumber,
            lastPage: manga.progress.lastPage,
            timestamp: manga.progress.timestamp,
          }
        : undefined,
    }));

    // Export reading history
    const history: BackupHistoryEntry[] = historyList.map((h) => ({
      id: h.id,
      mangaId: h.mangaId,
      mangaTitle: h.mangaTitle,
      mangaCover: h.mangaCover,
      chapterId: h.chapterId,
      chapterNumber: h.chapterNumber,
      chapterTitle: h.chapterTitle,
      chapterUrl: h.chapterUrl,
      pageReached: h.pageReached,
      totalPages: h.totalPages,
      timestamp: h.timestamp,
      sourceId: h.sourceId,
    }));

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      library,
      history,
    };
  }, [mangaList, historyList]);

  /**
   * Restore backup data into the database
   */
  const restoreBackup = useCallback(
    (
      backup: BackupData
    ): {
      success: boolean;
      imported: { manga: number; history: number };
      errors: string[];
    } => {
      const errors: string[] = [];
      let mangaCount = 0;
      let historyCount = 0;

      // Validate backup version
      if (backup.version > BACKUP_VERSION) {
        errors.push(
          `Backup version ${backup.version} is newer than supported ${BACKUP_VERSION}`
        );
        return { success: false, imported: { manga: 0, history: 0 }, errors };
      }

      realm.write(() => {
        // Restore library manga
        for (const mangaData of backup.library) {
          try {
            const existing = realm.objectForPrimaryKey<MangaSchema>(
              "Manga",
              mangaData.id
            );

            if (existing) {
              // Update existing - merge chapter read status
              mangaData.chapters.forEach((ch) => {
                const existingChapter = existing.chapters.find(
                  (ec: ChapterSchema) => ec.id === ch.id
                );
                if (existingChapter) {
                  existingChapter.isRead = ch.isRead || existingChapter.isRead;
                  existingChapter.lastPageRead = Math.max(
                    ch.lastPageRead,
                    existingChapter.lastPageRead
                  );
                }
              });
              // Update progress if backup is newer
              if (
                mangaData.progress &&
                (!existing.progress ||
                  mangaData.progress.timestamp > existing.progress.timestamp)
              ) {
                existing.progress = mangaData.progress as any;
              }
              existing.readingStatus =
                mangaData.readingStatus || existing.readingStatus;
            } else {
              // Create new manga
              realm.create("Manga", {
                id: mangaData.id,
                sourceId: mangaData.sourceId,
                title: mangaData.title,
                cover: mangaData.cover,
                url: mangaData.url,
                author: mangaData.author,
                description: mangaData.description,
                genres: mangaData.genres,
                readingStatus: mangaData.readingStatus || "reading",
                addedAt: mangaData.addedAt,
                chapters: mangaData.chapters,
                progress: mangaData.progress,
              });
            }
            mangaCount++;
          } catch (e) {
            errors.push(`Failed to restore manga: ${mangaData.title}`);
          }
        }

        // Restore reading history
        for (const historyData of backup.history) {
          try {
            const existing = realm.objectForPrimaryKey<ReadingHistorySchema>(
              "ReadingHistory",
              historyData.id
            );

            if (!existing) {
              realm.create("ReadingHistory", historyData);
              historyCount++;
            }
          } catch (e) {
            errors.push(`Failed to restore history entry: ${historyData.id}`);
          }
        }
      });

      return {
        success: errors.length === 0,
        imported: { manga: mangaCount, history: historyCount },
        errors,
      };
    },
    [realm]
  );

  /**
   * Export backup to file and share
   */
  const exportBackup = useCallback(async (): Promise<boolean> => {
    try {
      const backup = createBackup();
      const filename = `manga-reader-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      const path = (FileSystem.cacheDirectory ?? "") + filename;

      await FileSystem.writeAsStringAsync(
        path,
        JSON.stringify(backup, null, 2)
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "application/json",
          dialogTitle: "Export Backup",
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("[Backup] Export failed:", e);
      return false;
    }
  }, [createBackup]);

  /**
   * Import backup from file picker
   */
  const importBackup = useCallback(async (): Promise<{
    success: boolean;
    imported?: { manga: number; history: number };
    error?: string;
  }> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return { success: false, error: "Cancelled" };
      }

      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const backup: BackupData = JSON.parse(content);

      // Validate structure
      if (!backup.version || !backup.library) {
        return { success: false, error: "Invalid backup file format" };
      }

      const restoreResult = restoreBackup(backup);

      if (restoreResult.errors.length > 0) {
        console.warn("[Backup] Restore errors:", restoreResult.errors);
      }

      return {
        success: restoreResult.success,
        imported: restoreResult.imported,
        error: restoreResult.errors[0],
      };
    } catch (e) {
      console.error("[Backup] Import failed:", e);
      return { success: false, error: (e as Error).message };
    }
  }, [restoreBackup]);

  return {
    createBackup,
    restoreBackup,
    exportBackup,
    importBackup,
  };
}
