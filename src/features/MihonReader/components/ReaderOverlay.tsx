import { memo } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useViewerStore } from "../store/viewer.store";
import { PageSlider } from "./PageSlider";

interface ReaderOverlayProps {
  chapterTitle?: string;
  onSeekPage?: (page: number) => void;
}

/**
 * ReaderOverlay - Top and bottom control bars.
 * Shows/hides based on menuVisible state.
 */
function ReaderOverlayComponent({
  chapterTitle,
  onSeekPage,
}: ReaderOverlayProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const menuVisible = useViewerStore((s) => s.menuVisible);
  const mangaTitle = useViewerStore((s) => s.mangaTitle);
  const currentPage = useViewerStore((s) => s.currentPage);
  const totalPages = useViewerStore((s) => s.totalPages);

  // Animated styles for slide in/out
  const topBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(menuVisible ? 0 : -100, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        }),
      },
    ],
    opacity: withTiming(menuVisible ? 1 : 0, { duration: 200 }),
  }));

  const bottomBarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(menuVisible ? 0 : 100, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        }),
      },
    ],
    opacity: withTiming(menuVisible ? 1 : 0, { duration: 200 }),
  }));

  const handleBack = () => {
    router.back();
  };

  return (
    <>
      <StatusBar hidden={!menuVisible} />

      {/* Top Bar */}
      <Animated.View
        style={[styles.topBar, { paddingTop: insets.top + 8 }, topBarStyle]}
        pointerEvents={menuVisible ? "auto" : "none"}
      >
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.mangaTitle} numberOfLines={1}>
            {mangaTitle}
          </Text>
          {chapterTitle && (
            <Text style={styles.chapterTitle} numberOfLines={1}>
              {chapterTitle}
            </Text>
          )}
        </View>

        <View style={styles.spacer} />
      </Animated.View>

      {/* Bottom Bar */}
      <Animated.View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + 8 },
          bottomBarStyle,
        ]}
        pointerEvents={menuVisible ? "auto" : "none"}
      >
        <PageSlider onSeek={onSeekPage} />

        {/* Page indicator */}
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            {currentPage} / {totalPages}
          </Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 100,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  mangaTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  chapterTitle: {
    color: "#a1a1aa",
    fontSize: 13,
    marginTop: 2,
  },
  spacer: {
    width: 40,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingTop: 8,
    zIndex: 100,
  },
  pageIndicator: {
    alignItems: "center",
    paddingVertical: 8,
  },
  pageIndicatorText: {
    color: "#a1a1aa",
    fontSize: 12,
  },
});

export const ReaderOverlay = memo(ReaderOverlayComponent);
