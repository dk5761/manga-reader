/**
 * useMangaData - Consolidated data fetching for manga details
 * Handles session warmup, fetching from source, and local data fallback
 */

import { useEffect, useCallback } from "react";
import { useSession } from "@/shared/contexts/SessionContext";
import { useMangaDetails, useChapterList } from "../api/manga.queries";
import { useLibraryMangaById } from "@/features/Library/hooks";
import { getSource } from "@/sources";
import type { MangaDetails, Chapter } from "@/sources";

export type MangaDataParams = {
  id: string;
  sourceId: string;
  url: string;
};

export type DisplayManga = {
  title: string;
  cover: string;
  author: string;
  description?: string;
  genres: string[];
  url: string;
};

export type DisplayChapter = {
  id: string;
  mangaId: string;
  title: string;
  number: number;
  url: string;
  date?: string;
};

export function useMangaData(params: MangaDataParams) {
  const { id, sourceId, url } = params;
  const libraryId = `${sourceId}_${id}`;

  // Get source config
  const source = getSource(sourceId);

  // Session management
  const { isSessionReady, warmupSession } = useSession();
  const sessionReady = source?.needsCloudflareBypass
    ? isSessionReady(source.baseUrl)
    : true;

  // Local data from Realm
  const libraryManga = useLibraryMangaById(libraryId);
  const isLocalDataValid =
    libraryManga?.title && (libraryManga?.chapters?.length ?? 0) > 0;
  const hasLocalData = !!libraryManga && isLocalDataValid;

  // Only warmup if no local data (optimization)
  useEffect(() => {
    if (!hasLocalData && source?.needsCloudflareBypass && source?.baseUrl) {
      warmupSession(source.baseUrl, true);
    }
  }, [
    hasLocalData,
    source?.baseUrl,
    source?.needsCloudflareBypass,
    warmupSession,
  ]);

  // Fetch from source (only when session is ready)
  const {
    data: manga,
    isLoading: isMangaLoading,
    error: mangaError,
    refetch: refetchManga,
  } = useMangaDetails(sourceId, url, sessionReady);

  const {
    data: chapters,
    isLoading: isChaptersLoading,
    error: chaptersError,
    refetch: refetchChapters,
  } = useChapterList(sourceId, url, sessionReady);

  // Build display data (fresh data takes priority over local)
  const displayManga: DisplayManga | null = manga
    ? {
        title: manga.title,
        cover: manga.cover,
        author: manga.author || "Unknown",
        description: manga.description,
        genres: manga.genres || [],
        url: manga.url,
      }
    : hasLocalData
    ? {
        title: libraryManga!.title,
        cover: libraryManga!.cover || "",
        author: libraryManga!.author || "Unknown",
        description: libraryManga!.description,
        genres: [...(libraryManga!.genres || [])],
        url: url || "",
      }
    : null;

  const displayChapters: DisplayChapter[] =
    chapters?.map((ch) => ({
      id: ch.id,
      mangaId: ch.mangaId,
      title: ch.title || "",
      number: ch.number,
      url: ch.url,
      date: ch.date,
    })) ||
    libraryManga?.chapters?.map((ch) => ({
      id: ch.id,
      mangaId: libraryId,
      title: ch.title || "",
      number: ch.number,
      url: ch.url,
      date: undefined,
    })) ||
    [];

  // Loading states
  const isWaitingForSession = source?.needsCloudflareBypass && !sessionReady;
  const isLoading =
    !hasLocalData &&
    (isWaitingForSession || isMangaLoading || isChaptersLoading);
  const isRefreshing =
    hasLocalData &&
    (isMangaLoading || isChaptersLoading || isWaitingForSession);

  // Refetch handler
  const refetch = useCallback(async () => {
    await Promise.all([refetchManga(), refetchChapters()]);
  }, [refetchManga, refetchChapters]);

  return {
    // Data
    displayManga,
    displayChapters,
    libraryManga,
    source,

    // Raw data for add-to-library
    manga,
    chapters,

    // State
    isLoading,
    isRefreshing,
    hasLocalData,
    isWaitingForSession,

    // Errors
    error: mangaError || chaptersError,

    // Actions
    refetch,

    // IDs
    libraryId,
  };
}
