/**
 * MangaActions - Library toggle and reading status button
 * Contains hooks for add/remove from library
 */

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";
import {
  useAddToLibrary,
  useRemoveFromLibrary,
  useUpdateReadingStatus,
} from "@/features/Library/hooks";
import { ReadingStatusSheet } from "./ReadingStatusSheet";
import type { MangaDetails, Chapter } from "@/sources";
import type { ReadingStatus } from "@/core/database";

const STATUS_LABELS: Record<ReadingStatus, string> = {
  reading: "Reading",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
  plan_to_read: "Plan to Read",
};

export type MangaActionsProps = {
  mangaId: string;
  sourceId: string;
  manga: MangaDetails | null;
  chapters: Chapter[] | null;
  isInLibrary: boolean;
  readingStatus?: ReadingStatus;
};

export function MangaActions({
  mangaId,
  sourceId,
  manga,
  chapters,
  isInLibrary,
  readingStatus = "reading",
}: MangaActionsProps) {
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);

  const fgColor = useCSSVariable("--color-foreground");
  const foreground = typeof fgColor === "string" ? fgColor : "#fff";

  const addToLibrary = useAddToLibrary();
  const removeFromLibrary = useRemoveFromLibrary();
  const updateReadingStatus = useUpdateReadingStatus();

  const handleLibraryToggle = () => {
    if (!manga || !chapters) return;

    if (isInLibrary) {
      removeFromLibrary(mangaId);
    } else {
      addToLibrary(manga, chapters, sourceId);
    }
  };

  const handleStatusChange = (status: ReadingStatus) => {
    updateReadingStatus(mangaId, status);
  };

  return (
    <>
      {/* Add to Library Button */}
      <Pressable
        className={`w-full mt-6 rounded-lg py-3 items-center justify-center shadow-lg active:opacity-90 ${
          isInLibrary ? "bg-surface border border-primary" : "bg-primary"
        }`}
        onPress={handleLibraryToggle}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={isInLibrary ? "checkmark-circle" : "add-circle-outline"}
            size={18}
            color={isInLibrary ? "#00d9ff" : "#000"}
          />
          <Text
            className={`font-bold text-xs uppercase tracking-widest ${
              isInLibrary ? "text-primary" : "text-black"
            }`}
          >
            {isInLibrary ? "In Library" : "Add to Library"}
          </Text>
        </View>
      </Pressable>

      {/* Reading Status Button - Only when in library */}
      {isInLibrary && (
        <Pressable
          className="w-full mt-3 rounded-lg py-3 bg-surface border border-border items-center justify-center active:opacity-90"
          onPress={() => setStatusSheetVisible(true)}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="bookmark-outline" size={18} color={foreground} />
            <Text className="text-foreground font-medium">
              {STATUS_LABELS[readingStatus]}
            </Text>
            <Ionicons name="chevron-down" size={16} color={foreground} />
          </View>
        </Pressable>
      )}

      {/* Reading Status Sheet Modal */}
      <ReadingStatusSheet
        visible={statusSheetVisible}
        currentStatus={readingStatus}
        onSelect={handleStatusChange}
        onClose={() => setStatusSheetVisible(false)}
      />
    </>
  );
}
