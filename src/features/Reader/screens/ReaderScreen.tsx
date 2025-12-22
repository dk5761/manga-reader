import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  StatusBar,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MOCK_CHAPTER_PAGES } from "../data/mockData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ReaderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const chapter = MOCK_CHAPTER_PAGES;

  const [currentPage, setCurrentPage] = useState(1);
  const controlsVisible = useSharedValue(1);

  const toggleControls = useCallback(() => {
    controlsVisible.value = withTiming(controlsVisible.value === 1 ? 0 : 1, {
      duration: 200,
    });
  }, [controlsVisible]);

  // Tap gesture to toggle controls
  const tapGesture = Gesture.Tap().onEnd(() => {
    toggleControls();
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: controlsVisible.value,
    transform: [
      { translateY: interpolate(controlsVisible.value, [0, 1], [-50, 0]) },
    ],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: controlsVisible.value,
    transform: [
      { translateY: interpolate(controlsVisible.value, [0, 1], [50, 0]) },
    ],
  }));

  // Track scroll position for page indicator
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize } = event.nativeEvent;
      const totalHeight = contentSize.height;
      const scrollY = contentOffset.y;
      const pageHeight = totalHeight / chapter.pages.length;
      const pageIndex = Math.min(
        Math.floor(scrollY / pageHeight) + 1,
        chapter.pages.length
      );
      if (pageIndex !== currentPage && pageIndex >= 1) {
        setCurrentPage(pageIndex);
      }
    },
    [currentPage, chapter.pages.length]
  );

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      {/* Webtoon-style vertical scroll */}
      <GestureDetector gesture={tapGesture}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          {chapter.pages.map((page) => (
            <Image
              key={page.id}
              source={{ uri: page.url }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5 }}
              resizeMode="cover"
              className="bg-black"
            />
          ))}
        </ScrollView>
      </GestureDetector>

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
        pointerEvents="box-none"
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
              {chapter.mangaTitle}
            </Text>
            <Text className="text-zinc-400 text-xs">
              Chapter {chapter.chapterNumber}
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
        pointerEvents="box-none"
      >
        <View className="flex-row items-center justify-between px-6 py-4">
          <Pressable className="p-2">
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </Pressable>

          <View className="items-center">
            <Text className="text-white text-sm font-medium">
              {currentPage} / {chapter.pages.length}
            </Text>
          </View>

          <Pressable className="p-2">
            <Ionicons name="chevron-forward" size={28} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
