import { useState, useEffect, memo } from "react";
import {
  View,
  Image as RNImage,
  ActivityIndicator,
  Platform,
} from "react-native";
import axios from "axios";
import { Buffer } from "buffer";

type ProxiedImageProps = {
  uri: string;
  headers?: Record<string, string>;
  style?: object;
  contentFit?: "cover" | "contain" | "fill";
  className?: string;
};

/**
 * Custom image component that fetches images with proper headers
 * Works around Glide's limitation of not forwarding custom headers on Android
 */
function ProxiedImageComponent({
  uri,
  headers,
  style,
  contentFit = "cover",
  className,
}: ProxiedImageProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uri) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchImage() {
      try {
        setLoading(true);
        setError(false);

        const response = await axios.get(uri, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            Referer: new URL(uri).origin + "/",
            Accept: "image/webp,image/png,image/*,*/*;q=0.8",
            ...headers,
          },
        });

        if (response.status < 200 || response.status >= 300) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Convert arraybuffer to base64
        const base64 = Buffer.from(response.data, "binary").toString("base64");
        const contentType = response.headers["content-type"] || "image/jpeg";
        const dataUri = `data:${contentType};base64,${base64}`;

        if (!cancelled) {
          setImageData(dataUri);
          setLoading(false);
        }
      } catch (e) {
        console.log("[ProxiedImage] Error loading:", uri, e);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchImage();

    return () => {
      cancelled = true;
    };
  }, [uri, headers]);

  if (loading) {
    return (
      <View
        className={className}
        style={[style, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="small" color="#888" />
      </View>
    );
  }

  if (error || !imageData) {
    return (
      <View
        className={className}
        style={[style, { backgroundColor: "#27272a" }]}
      />
    );
  }

  return (
    <RNImage
      source={{ uri: imageData }}
      style={style}
      resizeMode={contentFit === "fill" ? "stretch" : contentFit}
    />
  );
}

export const ProxiedImage = memo(ProxiedImageComponent);
