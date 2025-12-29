import { memo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ChapterTransition } from "../models";

interface TransitionHolderProps {
  transition: ChapterTransition;
  onTap?: () => void;
  onLoadChapter?: () => void;
}

/**
 * TransitionHolder - Chapter transition separator.
 * Shows chapter boundaries and handles loading states for adjacent chapters.
 */
function TransitionHolderComponent({
  transition,
  onTap,
  onLoadChapter,
}: TransitionHolderProps) {
  const { direction, from, to } = transition;
  const isPrev = direction === "prev";

  // Determine state
  const status = to?.state.status ?? "none";
  const isWait = status === "wait";
  const isLoading = status === "loading";
  const isError = status === "error";
  const isLoaded = status === "loaded";
  const noChapter = !to;

  // Get display text
  const getTitle = () => {
    // No chapter available
    if (noChapter) {
      return isPrev ? "Beginning of series" : "You're all caught up!";
    }

    // Error state
    if (isError) {
      return "Failed to load chapter";
    }

    // Loading state
    if (isLoading) {
      return isPrev ? "Loading previous..." : "Loading next...";
    }

    // Chapter available (loaded or waiting)
    const chapterNum = to.chapter.number;
    const chapterTitle = to.chapter.title;

    if (isPrev) {
      return `← Chapter ${chapterNum}`;
    }
    return `Chapter ${chapterNum} →`;
  };

  const getSubtitle = () => {
    // No chapter
    if (noChapter) {
      return isPrev
        ? "This is the first chapter"
        : "No more chapters available";
    }

    // Error state
    if (isError && to?.state.status === "error") {
      return to.state.error;
    }

    // Loading state
    if (isLoading) {
      return "Please wait...";
    }

    // Wait state - not loaded yet
    if (isWait) {
      return "Tap to load chapter";
    }

    // Loaded - show chapter title or instruction
    const chapterTitle = to.chapter.title;
    if (chapterTitle) {
      return chapterTitle;
    }
    return `Scroll ${isPrev ? "up" : "down"} to continue`;
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isError) return "alert-circle";
    if (isLoading) return "hourglass";
    if (noChapter) return isPrev ? "flag" : "checkmark-circle";
    if (isWait) return "arrow-down-circle-outline";
    return isPrev ? "chevron-up-circle" : "chevron-down-circle";
  };

  // Color based on state
  const getIconColor = () => {
    if (isError) return "#ef4444";
    if (noChapter) return "#71717a";
    if (isLoading) return "#00d9ff";
    if (isLoaded) return "#22c55e"; // Green for loaded
    return "#00d9ff"; // Cyan for wait
  };

  // Show load button for wait or error states
  const showLoadButton = (isWait || isError) && to && onLoadChapter;

  return (
    <Pressable onPress={onTap} style={styles.container}>
      {/* Current chapter indicator */}
      <View style={styles.chapterIndicator}>
        <Text style={styles.chapterLabel}>
          {isPrev ? "Previous" : "Current"}: Chapter {from.chapter.number}
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
    </Pressable>
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
    color: "#71717a",
    fontSize: 12,
    fontWeight: "500",
  },
  separatorLine: {
    width: 100,
    height: 1,
    backgroundColor: "#27272a",
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  loadButton: {
    marginTop: 20,
    backgroundColor: "#00d9ff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loadButtonError: {
    backgroundColor: "#ef4444",
  },
  loadButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSeparator: {
    width: 64,
    height: 2,
    backgroundColor: "#27272a",
    marginTop: 32,
    borderRadius: 1,
  },
});

export const TransitionHolder = memo(TransitionHolderComponent);
