import { memo, useState, useCallback } from "react";
import { Dimensions, View, ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { WebViewImage } from "@/shared/components";
import { useReaderStore } from "../store/useReaderStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type WebViewZoomableImageProps = {
  uri: string;
  baseUrl?: string;
  width?: number;
  minHeight?: number;
  onTap?: () => void; // Keep for backwards compatibility
  onHeightChange?: (height: number) => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function WebViewZoomableImageComponent({
  uri,
  baseUrl,
  width = SCREEN_WIDTH,
  minHeight = 100,
  onTap,
  onHeightChange,
}: WebViewZoomableImageProps) {
  // Start with minimum height, will be updated when image loads
  const [height, setHeight] = useState(minHeight);
  const [isLoading, setIsLoading] = useState(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [isZoomed, setIsZoomed] = useState(false);

  const handleImageHeightChange = useCallback(
    (newHeight: number) => {
      setHeight(newHeight);
      setIsLoading(false);
      onHeightChange?.(newHeight);
    },
    [onHeightChange]
  );

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        runOnJS(setIsZoomed)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(setIsZoomed)(true);
      }
    });

  // Pan gesture for moving when zoomed
  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxTranslateX = ((scale.value - 1) * width) / 2;
      const maxTranslateY = ((scale.value - 1) * height) / 2;

      translateX.value = Math.min(
        maxTranslateX,
        Math.max(-maxTranslateX, savedTranslateX.value + event.translationX)
      );
      translateY.value = Math.min(
        maxTranslateY,
        Math.max(-maxTranslateY, savedTranslateY.value + event.translationY)
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap to zoom in/out
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        // Zoom out
        scale.value = withTiming(1, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        runOnJS(setIsZoomed)(false);
      } else {
        // Zoom in to 2x at tap point
        scale.value = withTiming(2, { duration: 200 });
        runOnJS(setIsZoomed)(true);
      }
    });

  // Single tap for controls toggle - uses store directly
  const handleTap = useCallback(() => {
    // Use store if available, fallback to onTap prop
    try {
      useReaderStore.getState().toggleControls();
    } catch {
      onTap?.();
    }
  }, [onTap]);

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(handleTap)();
    });

  // Compose gestures: Exclusive for taps (double takes priority), Simultaneous for pinch+pan
  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const zoomPanGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  const composedGesture = Gesture.Race(tapGestures, zoomPanGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[{ width, minHeight: height }, animatedStyle]}>
        {/* Loading indicator */}
        {isLoading && (
          <View style={[styles.loadingContainer, { width, height: minHeight }]}>
            <ActivityIndicator size="large" color="#00d9ff" />
          </View>
        )}

        <WebViewImage
          uri={uri}
          baseUrl={baseUrl}
          resizeMode="fill"
          width={width}
          onHeightChange={handleImageHeightChange}
          style={{ width, minHeight }}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    zIndex: 10,
  },
});

export const WebViewZoomableImage = memo(WebViewZoomableImageComponent);
