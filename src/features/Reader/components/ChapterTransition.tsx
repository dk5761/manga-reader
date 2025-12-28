import { memo } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TransitionItem } from "../types/infinite-reader.types";

interface ChapterTransitionProps {
  item: TransitionItem;
  onTap?: () => void;
  onLoadChapter?: () => void;
}

/**
 * Visual separator between chapters in infinite scroll.
 * Shows chapter info and handles loading states.
 */
export const ChapterTransition = memo(function ChapterTransition({
  item,
  onTap,
  onLoadChapter,
}: ChapterTransitionProps) {
  const { direction, targetChapter, isLoading, error } = item;

  // Determine display text
  const isPrev = direction === "prev";
  const isNext = direction === "next";

  const getTitle = () => {
    if (error) return "Failed to load";
    if (isLoading) return isPrev ? "Loading previous..." : "Loading next...";
    if (!targetChapter) {
      return isPrev ? "No previous chapter" : "You're all caught up!";
    }
    return isPrev
      ? `← Previous: Chapter ${targetChapter.number}`
      : `Next: Chapter ${targetChapter.number} →`;
  };

  const getSubtitle = () => {
    if (error) return error;
    if (isLoading) return "Please wait...";
    if (!targetChapter) {
      return isPrev
        ? "This is the first chapter"
        : "No more chapters available";
    }
    return (
      targetChapter.title || `Scroll ${isPrev ? "up" : "down"} to continue`
    );
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (error) return "alert-circle";
    if (isLoading) return "hourglass";
    if (!targetChapter) return isPrev ? "flag" : "checkmark-circle";
    return isPrev ? "chevron-up" : "chevron-down";
  };

  const iconColor = error ? "#ef4444" : targetChapter ? "#00d9ff" : "#71717a";

  return (
    <Pressable onPress={onTap}>
      <View className="items-center justify-center py-16 px-6 bg-zinc-900/50">
        {isLoading ? (
          <ActivityIndicator size="large" color="#00d9ff" />
        ) : (
          <Ionicons name={getIcon()} size={40} color={iconColor} />
        )}

        <Text className="text-white text-lg font-semibold mt-4 text-center">
          {getTitle()}
        </Text>

        <Text className="text-zinc-400 text-sm mt-2 text-center">
          {getSubtitle()}
        </Text>

        {error && onLoadChapter && (
          <Pressable
            onPress={onLoadChapter}
            className="mt-4 bg-zinc-800 px-4 py-2 rounded-lg"
          >
            <Text className="text-white text-sm">Retry</Text>
          </Pressable>
        )}

        {/* Visual separator line */}
        <View className="w-16 h-0.5 bg-zinc-700 mt-6 rounded-full" />
      </View>
    </Pressable>
  );
});
