import { memo, useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { useViewerStore } from "../store/viewer.store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PageSliderProps {
  onSeek?: (page: number) => void;
}

/**
 * PageSlider - Progress slider for page navigation.
 */
function PageSliderComponent({ onSeek }: PageSliderProps) {
  const currentPage = useViewerStore((s) => s.currentPage);
  const totalPages = useViewerStore((s) => s.totalPages);

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(currentPage);

  const displayPage = isDragging ? dragValue : currentPage;

  const handleSlidingStart = useCallback(() => {
    setIsDragging(true);
    setDragValue(currentPage);
  }, [currentPage]);

  const handleValueChange = useCallback((value: number) => {
    setDragValue(Math.round(value));
  }, []);

  const handleSlidingComplete = useCallback(
    (value: number) => {
      const page = Math.round(value);
      setIsDragging(false);
      onSeek?.(page);
    },
    [onSeek]
  );

  if (totalPages === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageText}>{displayPage}</Text>

      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={totalPages}
        value={displayPage}
        step={1}
        onSlidingStart={handleSlidingStart}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor="#00d9ff"
        maximumTrackTintColor="#3f3f46"
        thumbTintColor="#00d9ff"
      />

      <Text style={styles.pageText}>{totalPages}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },
  pageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    minWidth: 30,
    textAlign: "center",
  },
});

export const PageSlider = memo(PageSliderComponent);
