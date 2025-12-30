import { useState, useCallback, memo, useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Dimensions } from "react-native";
import FastImage, { FastImageProps } from "react-native-fast-image";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// CDN fallback list for 2xstorage
const CDN_HOSTS = [
  "imgs-2.2xstorage.com",
  "img-r1.2xstorage.com",
  "imgs.2xstorage.com",
  "img.2xstorage.com",
];

// Default aspect ratio for manga pages (portrait)
const DEFAULT_ASPECT_RATIO = 2 / 3;
// Minimum placeholder height (80% of screen like Mihon)
const MIN_PLACEHOLDER_HEIGHT = SCREEN_HEIGHT * 0.8;

type MangaImageProps = {
  uri: string;
  headers?: Record<string, string>;
  style?: FastImageProps["style"];
  resizeMode?: "contain" | "cover" | "stretch" | "center";
  priority?: "low" | "normal" | "high";
  /** Optional aspect ratio from source (for future Approach D) */
  sourceAspectRatio?: number;
  onLoad?: () => void;
  onError?: () => void;
  onProgress?: (event: {
    nativeEvent: { loaded: number; total: number };
  }) => void;
};

/**
 * Unified image component using react-native-fast-image.
 *
 * Features:
 * - Native SDWebImage (iOS) / Glide (Android)
 * - CDN fallback for 2xstorage hosts
 * - Skeleton placeholder with estimated aspect ratio
 * - Screen-relative minimum height (Mihon-style)
 * - Smooth transition from placeholder to image
 */
function MangaImageComponent({
  uri,
  headers,
  style,
  resizeMode = "contain",
  priority = "high",
  sourceAspectRatio,
  onLoad,
  onError,
  onProgress,
}: MangaImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUri, setCurrentUri] = useState(uri);
  const [aspectRatio, setAspectRatio] = useState<number>(
    sourceAspectRatio ?? DEFAULT_ASPECT_RATIO
  );
  const cdnIndexRef = useRef(0);
  const originalHostRef = useRef<string | null>(null);

  // Reset state when URI changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setCurrentUri(uri);
    setAspectRatio(sourceAspectRatio ?? DEFAULT_ASPECT_RATIO);
    cdnIndexRef.current = 0;

    try {
      const url = new URL(uri);
      originalHostRef.current = url.host;
    } catch {
      originalHostRef.current = null;
    }
  }, [uri, sourceAspectRatio]);

  const tryNextCdn = useCallback(() => {
    if (!uri) return;

    try {
      const url = new URL(uri);

      // Only try fallbacks for 2xstorage CDN
      if (!url.host.includes("2xstorage.com")) {
        return;
      }

      cdnIndexRef.current++;

      // Get list of CDNs to try (excluding the original host)
      const cdnsToTry = CDN_HOSTS.filter((h) => h !== originalHostRef.current);

      if (cdnIndexRef.current <= cdnsToTry.length) {
        const nextCdn = cdnsToTry[cdnIndexRef.current - 1];
        url.host = nextCdn;
        const newUri = url.toString();
        console.log(`[MangaImage] Trying CDN fallback: ${nextCdn}`);
        setCurrentUri(newUri);
        setLoading(true);
        setError(false);
      } else {
        // All CDNs exhausted
        setError(true);
        setLoading(false);
      }
    } catch (e) {
      setError(true);
      setLoading(false);
    }
  }, [uri]);

  const handleLoad = useCallback(
    (event: any) => {
      // Get image dimensions from load event and update aspect ratio
      const { width, height } = event.nativeEvent;
      if (width && height) {
        setAspectRatio(width / height);
      }
      setLoading(false);
      setError(false);
      onLoad?.();
    },
    [onLoad]
  );

  const handleError = useCallback(() => {
    console.log(`[MangaImage] Error loading: ${currentUri}`);

    // Try CDN fallback
    if (cdnIndexRef.current === 0) {
      tryNextCdn();
    } else {
      setError(true);
      setLoading(false);
      onError?.();
    }
  }, [currentUri, tryNextCdn, onError]);

  if (!uri) {
    return <View style={[styles.placeholder, style]} />;
  }

  // Map priority to FastImage priority enum
  const fastImagePriority =
    priority === "high"
      ? FastImage.priority.high
      : priority === "low"
      ? FastImage.priority.low
      : FastImage.priority.normal;

  // Map resizeMode to FastImage resizeMode enum
  const fastImageResizeMode =
    resizeMode === "contain"
      ? FastImage.resizeMode.contain
      : resizeMode === "cover"
      ? FastImage.resizeMode.cover
      : resizeMode === "stretch"
      ? FastImage.resizeMode.stretch
      : FastImage.resizeMode.center;

  // Image style with aspect ratio
  const imageStyle = { width: SCREEN_WIDTH, aspectRatio };

  return (
    <View style={[styles.container, style]}>
      {/* Skeleton placeholder - only show while loading */}
      {loading && !error && (
        <View
          style={[
            styles.skeleton,
            { aspectRatio, minHeight: MIN_PLACEHOLDER_HEIGHT },
          ]}
        >
          <ActivityIndicator size="large" color="#555" style={styles.spinner} />
        </View>
      )}

      {/* Actual image */}
      {!error && (
        <FastImage
          style={[styles.image, imageStyle]}
          source={{
            uri: currentUri,
            headers: headers,
            priority: fastImagePriority,
            cache: FastImage.cacheControl.immutable,
          }}
          resizeMode={fastImageResizeMode}
          onLoad={handleLoad}
          onError={handleError}
          onProgress={onProgress}
        />
      )}

      {/* Error state */}
      {error && <View style={styles.errorPlaceholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000",
  },
  skeleton: {
    width: SCREEN_WIDTH,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    position: "absolute",
  },
  image: {
    width: SCREEN_WIDTH,
  },
  placeholder: {
    width: SCREEN_WIDTH,
    minHeight: MIN_PLACEHOLDER_HEIGHT,
    backgroundColor: "#1a1a1a",
  },
  errorPlaceholder: {
    width: SCREEN_WIDTH,
    minHeight: MIN_PLACEHOLDER_HEIGHT * 0.8,
    backgroundColor: "#27272a",
  },
});

export const MangaImage = memo(MangaImageComponent);
