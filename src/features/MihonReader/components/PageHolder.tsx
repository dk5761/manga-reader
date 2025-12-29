import { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MangaImage } from "@/shared/components/MangaImage";
import type { ReaderPage } from "../models";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PageHolderProps {
  page: ReaderPage;
  onTap?: () => void;
  onRetry?: () => void;
}

/**
 * PageHolder - Renders a single manga page.
 * Matches Mihon's WebtoonPageHolder.
 */
function PageHolderComponent({ page, onTap, onRetry }: PageHolderProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(false);
    // Force re-render by triggering a state change
    onRetry?.();
  }, [onRetry]);

  if (error) {
    return (
      <Pressable onPress={onTap} style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load page</Text>
        <Text style={styles.errorSubtext}>Page {page.index + 1}</Text>
        <Pressable onPress={handleRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onTap} style={styles.container}>
      <MangaImage
        uri={page.page.imageUrl}
        headers={page.page.headers}
        style={styles.image}
        resizeMode="contain"
        priority="high"
        onLoad={handleLoad}
        onError={handleError}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000",
  },
  image: {
    width: SCREEN_WIDTH,
  },
  errorContainer: {
    width: SCREEN_WIDTH,
    height: 400,
    backgroundColor: "#18181b",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  errorSubtext: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 4,
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
});

export const PageHolder = memo(PageHolderComponent);
