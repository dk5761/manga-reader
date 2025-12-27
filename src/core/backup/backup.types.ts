/**
 * Backup file format types
 */

export interface BackupChapter {
  id: string;
  number: number;
  title?: string;
  url: string;
  isRead: boolean;
  lastPageRead: number;
}

export interface BackupProgress {
  lastChapterId?: string;
  lastChapterNumber?: number;
  lastPage: number;
  timestamp: number;
}

export interface BackupManga {
  id: string;
  sourceId: string;
  title: string;
  cover?: string;
  url: string;
  author?: string;
  description?: string;
  genres: string[];
  readingStatus?: string;
  addedAt: number;
  chapters: BackupChapter[];
  progress?: BackupProgress;
}

export interface BackupHistoryEntry {
  id: string;
  mangaId: string;
  mangaTitle: string;
  mangaCover?: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string;
  chapterUrl: string;
  pageReached: number;
  totalPages?: number;
  timestamp: number;
  sourceId: string;
}

export interface BackupData {
  version: number;
  createdAt: string;
  appVersion: string;
  library: BackupManga[];
  history: BackupHistoryEntry[];
}

export const BACKUP_VERSION = 1;
export const APP_VERSION = "1.0.0";
