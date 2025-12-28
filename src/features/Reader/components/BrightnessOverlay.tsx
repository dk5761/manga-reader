import { memo } from "react";
import { View, StyleSheet } from "react-native";
import { useReaderStore } from "../store/useReaderStore";

/**
 * Semi-transparent overlay for brightness control.
 * Lower brightness = darker overlay (more opacity).
 * pointerEvents="none" ensures it doesn't block touch.
 */
export const BrightnessOverlay = memo(function BrightnessOverlay() {
  const brightness = useReaderStore((s) => s.brightness);

  // Convert brightness (10-100) to overlay opacity (0.9-0)
  // brightness 100 = opacity 0 (no overlay)
  // brightness 10 = opacity 0.9 (very dark)
  const overlayOpacity = (100 - brightness) / 100;

  if (overlayOpacity === 0) {
    return null;
  }

  return (
    <View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents="none"
    />
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});
