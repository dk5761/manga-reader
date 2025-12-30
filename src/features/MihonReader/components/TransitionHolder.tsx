import { memo, useRef, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  PanResponder,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChapterTransition } from "../models";

interface TransitionHolderProps {
  transition: ChapterTransition;
  onTap?: () => void;
  onLoadChapter?: () => void;
}

// Swipe threshold to trigger chapter load
const SWIPE_THRESHOLD = 80;

/**
 * TransitionHolder - Chapter transition separator.
 * Shows chapter boundaries with swipe gesture to load next chapter.
 */
function TransitionHolderComponent({
  transition,
  onTap,
  onLoadChapter,
}: TransitionHolderProps) {
  const { direction, from, to } = transition;
  const isPrev = direction === "prev";

  // Swipe animation
  const swipeOffset = useRef(new Animated.Value(0)).current;
  const swipeTriggered = useRef(false);

  // Determine state
  const status = to?.state.status ?? "none";
  const isWait = status === "wait";
  const isLoading = status === "loading";
  const isError = status === "error";
  const isLoaded = status === "loaded";
  const noChapter = !to;

  // Can we load this chapter?
  const canLoad = to && (isWait || isLoaded) && onLoadChapter && !isPrev;

  // Pan responder for swipe gesture (like Telegram)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!canLoad,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to vertical swipes when we can load
          return !!canLoad && Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: () => {
          swipeTriggered.current = false;
        },
        onPanResponderMove: (_, gestureState) => {
          // For next chapter: swipe UP (negative dy)
          const offset = Math.min(0, gestureState.dy);
          swipeOffset.setValue(offset);

          // Check threshold
          if (offset < -SWIPE_THRESHOLD && !swipeTriggered.current) {
            swipeTriggered.current = true;
          }
        },
        onPanResponderRelease: () => {
          if (swipeTriggered.current && onLoadChapter) {
            onLoadChapter();
          }
          // Reset animation
          Animated.spring(swipeOffset, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [canLoad, onLoadChapter]
  );

  // Get display text
  const getTitle = () => {
    if (noChapter) {
      return isPrev ? "Beginning of series" : "You're all caught up!";
    }
    if (isError) return "Failed to load chapter";
    if (isLoading) return isPrev ? "Loading previous..." : "Loading next...";

    const chapterNum = to.chapter.number;
    if (isPrev) return `← Chapter ${chapterNum}`;
    return `Chapter ${chapterNum} →`;
  };

  const getSubtitle = () => {
    if (noChapter) {
      return isPrev
        ? "This is the first chapter"
        : "No more chapters available";
    }
    if (isError && to?.state.status === "error") {
      return to.state.error;
    }
    if (isLoading) return "Please wait...";

    // Show swipe hint for next chapter
    if (!isPrev && canLoad) {
      return "Swipe up or tap button to continue";
    }

    if (isWait) return "Tap to load chapter";

    const chapterTitle = to.chapter.title;
    if (chapterTitle && chapterTitle.toLowerCase() !== "chapter") {
      return chapterTitle;
    }
    return `Scroll ${isPrev ? "up" : "down"} to continue`;
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isError) return "alert-circle";
    if (isLoading) return "hourglass";
    if (noChapter) return isPrev ? "flag" : "checkmark-circle";
    // Show swipe icon for next chapter
    if (!isPrev && canLoad) return "arrow-up-circle";
    if (isWait) return "arrow-down-circle-outline";
    return isPrev ? "chevron-up-circle" : "chevron-down-circle";
  };

  const getIconColor = () => {
    if (isError) return "#ef4444";
    if (noChapter) return "#71717a";
    if (isLoading) return "#00d9ff";
    if (canLoad) return "#22c55e"; // Green for ready to load
    return "#00d9ff";
  };

  // Show load button for next chapter when available
  const showLoadButton =
    !isPrev && to && (isWait || isLoaded || isError) && onLoadChapter;

  // Swipe progress indicator
  const swipeProgress = swipeOffset.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: swipeOffset }] }]}
      {...(canLoad ? panResponder.panHandlers : {})}
    >
      {/* Current chapter indicator */}
      <View style={styles.chapterIndicator}>
        <Text style={styles.chapterLabel}>
          {isPrev
            ? to
              ? `Previous: Chapter ${to.chapter.number}`
              : "Beginning of series"
            : `Current: Chapter ${from.chapter.number}`}
        </Text>
      </View>

      {/* Separator line */}
      <View style={styles.separatorLine} />

      {/* Icon */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#00d9ff" />
      ) : (
        <Ionicons name={getIcon()} size={48} color={getIconColor()} />
      )}

      {/* Title */}
      <Text style={styles.title}>{getTitle()}</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

      {/* Swipe indicator for next chapter */}
      {canLoad && (
        <Animated.View
          style={[styles.swipeIndicator, { opacity: swipeProgress }]}
        >
          <Ionicons name="chevron-up" size={24} color="#22c55e" />
          <Text style={styles.swipeHint}>Release to load</Text>
        </Animated.View>
      )}

      {/* Load/Retry button */}
      {showLoadButton && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onLoadChapter?.();
          }}
          style={[styles.loadButton, isError && styles.loadButtonError]}
        >
          <Text style={styles.loadButtonText}>
            {isError ? "Retry" : "Load Chapter"}
          </Text>
        </Pressable>
      )}

      {/* Bottom separator */}
      <View style={styles.bottomSeparator} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: "#0a0a0a",
  },
  chapterIndicator: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  chapterLabel: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "500",
  },
  separatorLine: {
    width: 60,
    height: 2,
    backgroundColor: "#27272a",
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  swipeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  swipeHint: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "500",
  },
  loadButton: {
    marginTop: 24,
    backgroundColor: "#22c55e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loadButtonError: {
    backgroundColor: "#ef4444",
  },
  loadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSeparator: {
    width: 60,
    height: 2,
    backgroundColor: "#27272a",
    marginTop: 24,
  },
});

export const TransitionHolder = memo(TransitionHolderComponent);
