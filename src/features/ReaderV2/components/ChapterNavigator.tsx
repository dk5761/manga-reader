/**
 * ChapterNavigator Component
 *
 * Page slider with chapter navigation buttons.
 * Implements Mihon's seek bar with haptic feedback.
 */

import { memo, useCallback } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useReaderStoreV2 } from "../store/useReaderStoreV2";
import type { ViewerChapters } from "../types/reader.types";

// Optional haptics - gracefully degrade if not available
let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {
  // expo-haptics not installed
}

const triggerHaptic = (type: "selection" | "light" | "medium") => {
  if (!Haptics || Platform.OS === "web") return;
  try {
    if (type === "selection") {
      Haptics.selectionAsync();
    } else if (type === "light") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Haptics not available
  }
};

interface ChapterNavigatorProps {
  viewerChapters: ViewerChapters;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
}

export function ChapterNavigator({
  viewerChapters,
  onPrevChapter,
  onNextChapter,
}: ChapterNavigatorProps) {
  const currentPage = useReaderStoreV2((s) => s.currentPage);
  const totalPages = useReaderStoreV2((s) => s.totalPages);
  const seekToPage = useReaderStoreV2((s) => s.seekToPage);
  const setIsSeeking = useReaderStoreV2((s) => s.setIsSeeking);
  const setCurrentPage = useReaderStoreV2((s) => s.setCurrentPage);

  const hasPrevChapter = viewerChapters.prevChapter !== null;
  const hasNextChapter = viewerChapters.nextChapter !== null;

  // Handle slider drag start
  const handleSliderStart = useCallback(() => {
    setIsSeeking(true);
    triggerHaptic("selection");
  }, [setIsSeeking]);

  // Handle slider value change (live update display)
  const handleSliderChange = useCallback(
    (value: number) => {
      // Update page display immediately for feedback
      setCurrentPage(Math.round(value));
    },
    [setCurrentPage]
  );

  // Handle slider drag complete (perform seek)
  const handleSliderComplete = useCallback(
    (value: number) => {
      const targetPage = Math.round(value);
      triggerHaptic("light");
      seekToPage(targetPage);
    },
    [seekToPage]
  );

  // Chapter navigation with haptics
  const handlePrevChapter = useCallback(() => {
    if (hasPrevChapter) {
      triggerHaptic("medium");
      onPrevChapter?.();
    }
  }, [hasPrevChapter, onPrevChapter]);

  const handleNextChapter = useCallback(() => {
    if (hasNextChapter) {
      triggerHaptic("medium");
      onNextChapter?.();
    }
  }, [hasNextChapter, onNextChapter]);

  return (
    <View className="px-4">
      {/* Page indicator */}
      <Text className="text-white text-sm font-medium text-center mb-2">
        {currentPage + 1} / {totalPages}
      </Text>

      {/* Slider with chapter navigation */}
      <View className="flex-row items-center">
        {/* Previous Chapter */}
        <Pressable
          onPress={handlePrevChapter}
          disabled={!hasPrevChapter}
          className="p-2"
          style={{ opacity: hasPrevChapter ? 1 : 0.3 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        <Text className="text-zinc-400 text-xs w-6 text-center">1</Text>

        <View className="flex-1 mx-1">
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={Math.max(0, totalPages - 1)}
            step={1}
            value={currentPage}
            onSlidingStart={handleSliderStart}
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSliderComplete}
            minimumTrackTintColor="#3b82f6"
            maximumTrackTintColor="#3f3f46"
            thumbTintColor="#3b82f6"
          />
        </View>

        <Text className="text-zinc-400 text-xs w-6 text-center">
          {totalPages}
        </Text>

        {/* Next Chapter */}
        <Pressable
          onPress={handleNextChapter}
          disabled={!hasNextChapter}
          className="p-2"
          style={{ opacity: hasNextChapter ? 1 : 0.3 }}
        >
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
