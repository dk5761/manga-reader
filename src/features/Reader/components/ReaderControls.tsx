import { memo, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useReaderStore } from "../store/useReaderStore";
import type { Chapter } from "@/sources";

interface ReaderControlsProps {
  chapters?: Chapter[];
  onScrollToPage: (page: number) => void;
}

/**
 * ReaderControls renders the header and footer overlay.
 * Uses Zustand selectors for fine-grained subscriptions.
 */
export const ReaderControls = memo(function ReaderControls({
  chapters,
  onScrollToPage,
}: ReaderControlsProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Fine-grained subscriptions - only re-render when these specific values change
  const currentPage = useReaderStore((s) => s.currentPage);
  const totalPages = useReaderStore((s) => s.totalPages);
  const isControlsVisible = useReaderStore((s) => s.isControlsVisible);
  const chapterId = useReaderStore((s) => s.chapterId);

  // Chapter navigation
  const currentChapterIndex =
    chapters?.findIndex((ch) => ch.id === chapterId) ?? -1;
  const hasPrevChapter = currentChapterIndex < (chapters?.length ?? 0) - 1;
  const hasNextChapter = currentChapterIndex > 0;

  const goToPrevChapter = useCallback(() => {
    if (!chapters || !hasPrevChapter) return;
    const prevChapter = chapters[currentChapterIndex + 1];
    const state = useReaderStore.getState();
    router.replace({
      pathname: "/reader/[chapterId]",
      params: {
        chapterId: prevChapter.id,
        sourceId: state.sourceId,
        url: prevChapter.url,
        mangaUrl: "", // Will be resolved from route
        mangaId: state.mangaId,
        chapterNumber: prevChapter.number.toString(),
        chapterTitle: prevChapter.title || "",
      },
    });
  }, [chapters, currentChapterIndex, hasPrevChapter, router]);

  const goToNextChapter = useCallback(() => {
    if (!chapters || !hasNextChapter) return;
    const nextChapter = chapters[currentChapterIndex - 1];
    const state = useReaderStore.getState();
    router.replace({
      pathname: "/reader/[chapterId]",
      params: {
        chapterId: nextChapter.id,
        sourceId: state.sourceId,
        url: nextChapter.url,
        mangaUrl: "",
        mangaId: state.mangaId,
        chapterNumber: nextChapter.number.toString(),
        chapterTitle: nextChapter.title || "",
      },
    });
  }, [chapters, currentChapterIndex, hasNextChapter, router]);

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isControlsVisible ? 1 : 0, { duration: 200 }),
    transform: [
      {
        translateY: withTiming(isControlsVisible ? 0 : -50, { duration: 200 }),
      },
    ],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isControlsVisible ? 1 : 0, { duration: 200 }),
    transform: [
      {
        translateY: withTiming(isControlsVisible ? 0 : 50, { duration: 200 }),
      },
    ],
  }));

  const handleSliderStart = useCallback(() => {
    useReaderStore.getState().setSliderDragging(true);
  }, []);

  const handleSliderChange = useCallback((value: number) => {
    useReaderStore.getState().setPage(Math.round(value));
  }, []);

  const handleSliderComplete = useCallback(
    (value: number) => {
      const targetPage = Math.round(value);
      onScrollToPage(targetPage);
      // Clear dragging flag after scroll animation settles
      setTimeout(() => {
        useReaderStore.getState().setSliderDragging(false);
      }, 500);
    },
    [onScrollToPage]
  );

  return (
    <>
      {/* Header Controls */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
          },
          headerStyle,
        ]}
        className="bg-black/70"
        pointerEvents={isControlsVisible ? "auto" : "none"}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View className="flex-1 mx-4">
            <Text
              className="text-white text-sm font-semibold"
              numberOfLines={1}
            >
              Chapter {chapterId}
            </Text>
          </View>
          <Pressable className="p-2 -mr-2">
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>

      {/* Footer Controls */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom + 16,
          },
          footerStyle,
        ]}
        className="bg-black/70"
        pointerEvents={isControlsVisible ? "auto" : "none"}
      >
        <View className="px-4">
          {/* Page indicator */}
          <Text className="text-white text-sm font-medium text-center mb-2">
            {currentPage} / {totalPages}
          </Text>

          {/* Page Slider with Chapter Navigation */}
          <View className="flex-row items-center">
            {/* Previous Chapter Arrow */}
            <Pressable
              onPress={goToPrevChapter}
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
                minimumValue={1}
                maximumValue={totalPages}
                step={1}
                value={currentPage}
                onSlidingStart={handleSliderStart}
                onValueChange={handleSliderChange}
                onSlidingComplete={handleSliderComplete}
                minimumTrackTintColor="#00d9ff"
                maximumTrackTintColor="#3f3f46"
                thumbTintColor="#00d9ff"
              />
            </View>
            <Text className="text-zinc-400 text-xs w-6 text-center">
              {totalPages}
            </Text>

            {/* Next Chapter Arrow */}
            <Pressable
              onPress={goToNextChapter}
              disabled={!hasNextChapter}
              className="p-2"
              style={{ opacity: hasNextChapter ? 1 : 0.3 }}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </>
  );
});
