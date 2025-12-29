import { memo, useCallback } from "react";
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
  onRetry?: () => void;
}

/**
 * TransitionHolder - Chapter transition separator.
 * Matches Mihon's WebtoonTransitionHolder.
 */
function TransitionHolderComponent({
  transition,
  onTap,
  onRetry,
}: TransitionHolderProps) {
  const { direction, from, to } = transition;
  const isPrev = direction === "prev";

  // Determine state
  const status = to?.state.status ?? "none";
  const isLoading = status === "loading";
  const isError = status === "error";
  const noChapter = !to;

  // Get display text
  const getTitle = () => {
    if (noChapter) {
      return isPrev ? "No previous chapter" : "You're all caught up!";
    }
    if (isError) {
      return "Failed to load chapter";
    }
    if (isLoading) {
      return isPrev ? "Loading previous..." : "Loading next...";
    }
    // Chapter available
    const chapterNum = to.chapter.number;
    return isPrev
      ? `← Previous: Chapter ${chapterNum}`
      : `Next: Chapter ${chapterNum} →`;
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
    if (isLoading) {
      return "Please wait...";
    }
    // Chapter ready
    return to.chapter.title || `Scroll ${isPrev ? "up" : "down"} to continue`;
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isError) return "alert-circle";
    if (isLoading) return "hourglass";
    if (noChapter) return isPrev ? "flag" : "checkmark-circle";
    return isPrev ? "chevron-up" : "chevron-down";
  };

  const iconColor = isError ? "#ef4444" : to ? "#00d9ff" : "#71717a";

  return (
    <Pressable onPress={onTap} style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#00d9ff" />
      ) : (
        <Ionicons name={getIcon()} size={40} color={iconColor} />
      )}

      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

      {isError && onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}

      {/* Visual separator */}
      <View style={styles.separator} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: "rgba(24, 24, 27, 0.8)",
  },
  title: {
    color: "#fff",
    fontSize: 18,
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
  retryButton: {
    marginTop: 16,
    backgroundColor: "#27272a",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
  },
  separator: {
    width: 64,
    height: 2,
    backgroundColor: "#3f3f46",
    marginTop: 24,
    borderRadius: 1,
  },
});

export const TransitionHolder = memo(TransitionHolderComponent);
