import { useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { LibraryFilter, LibraryGrid } from "../components";
import { EmptyState } from "@/shared/components";
import { LIBRARY_FILTERS } from "../data/mockData";
import { useLibraryStore } from "../stores/useLibraryStore";
import { useLibraryManga } from "../hooks";

export function LibraryScreen() {
  const router = useRouter();
  const { activeCategory, setActiveCategory } = useLibraryStore();

  // Fetch from Realm database
  const libraryManga = useLibraryManga();

  // Filter manga based on active category from store
  const filteredManga = useMemo(() => {
    if (activeCategory === "All") {
      return [...libraryManga];
    }

    const statusMap: Record<string, string> = {
      Reading: "reading",
      Completed: "completed",
      "Plan to Read": "plan_to_read",
      "On Hold": "on_hold",
      Dropped: "dropped",
    };

    return libraryManga.filter(
      (manga) => manga.readingStatus === statusMap[activeCategory]
    );
  }, [activeCategory, libraryManga]);

  // Transform Realm objects to grid format
  const gridData = useMemo(() => {
    return filteredManga.map((manga) => {
      const readChapters = manga.chapters.filter((ch) => ch.isRead).length;
      const totalChapters = manga.chapters.length;
      const lastReadChapter = manga.progress?.lastChapterNumber;

      return {
        id: manga.id,
        title: manga.title,
        cover: manga.cover || "",
        localCover: manga.localCover,
        readingStatus: (manga.readingStatus || "reading") as
          | "reading"
          | "completed"
          | "plan_to_read"
          | "on_hold"
          | "dropped",
        totalChapters,
        currentChapter: lastReadChapter,
        unreadCount: totalChapters - readChapters,
      };
    });
  }, [filteredManga]);

  const handleMangaPress = (id: string) => {
    const manga = libraryManga.find((m) => m.id === id);
    if (manga) {
      // Serialize minimal data for instant render on destination screen
      const preloadedData = {
        title: manga.title,
        cover: manga.cover,
        localCover: manga.localCover,
        author: manga.author,
        description: manga.description,
        genres: [...manga.genres],
        chapterCount: manga.chapters.length,
        readingStatus: manga.readingStatus,
      };

      router.push({
        pathname: "/manga/[id]",
        params: {
          id: manga.id.replace(`${manga.sourceId}_`, ""),
          sourceId: manga.sourceId,
          url: manga.url,
          preloaded: JSON.stringify(preloadedData),
        },
      });
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Grid with filters as list header */}
      <LibraryGrid
        manga={gridData}
        onMangaPress={handleMangaPress}
        ListHeaderComponent={
          <View className="pb-4">
            <LibraryFilter
              filters={LIBRARY_FILTERS}
              activeFilter={activeCategory}
              onFilterChange={setActiveCategory}
            />
          </View>
        }
      />

      {/* Empty State Overlay */}
      {gridData.length === 0 && (
        <View className="absolute inset-x-0 top-1/3">
          <EmptyState
            icon="book-outline"
            title="No manga found"
            description={
              activeCategory === "All"
                ? "Add manga from Browse tab"
                : `No titles in "${activeCategory}"`
            }
          />
        </View>
      )}
    </View>
  );
}
