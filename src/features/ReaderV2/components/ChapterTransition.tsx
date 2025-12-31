/**
 * ChapterTransition Component
 *
 * Displays transition UI between chapters.
 * Shows "Previous Chapter" or "Next Chapter" with loading state.
 */

import { memo } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import type { TransitionItem } from "../types/reader.types";

interface ChapterTransitionProps {
  item: TransitionItem;
  onLoad?: () => void;
}

export const ChapterTransition = memo(function ChapterTransition({
  item,
  onLoad,
}: ChapterTransitionProps) {
  const { direction, targetChapter, isLoading } = item;

  const title = direction === "prev" ? "Previous Chapter" : "Next Chapter";
  const chapterName = targetChapter
    ? targetChapter.chapter.title ?? `Chapter ${targetChapter.chapter.number}`
    : "No more chapters";
  const hasTarget = targetChapter !== null;

  return (
    <View className="w-full h-48 items-center justify-center bg-neutral-900 border-y border-neutral-800">
      <Text className="text-neutral-400 text-sm uppercase tracking-wider mb-2">
        {title}
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#3b82f6" size="small" />
      ) : hasTarget ? (
        <Pressable
          onPress={onLoad}
          className="bg-neutral-800 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">{chapterName}</Text>
        </Pressable>
      ) : (
        <Text className="text-neutral-500">{chapterName}</Text>
      )}
    </View>
  );
});
