import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HoldProgressIndicatorProps {
  progress: number; // 0 to 1
  size?: number;
}

export function HoldProgressIndicator({
  progress,
  size = 100,
}: HoldProgressIndicatorProps) {
  const circleRadius = size / 2 - 6; // Inner green circle
  const progressRadius = size / 2 - 4; // Progress ring radius
  const circumference = 2 * Math.PI * progressRadius;

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = withTiming(circumference * (1 - progress), {
      duration: 100,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth easing
    });
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* SVG for circles */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Background track (dark) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={progressRadius}
          stroke="#27272a"
          strokeWidth={6}
          fill="none"
        />
        {/* Progress circle (green) */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={progressRadius}
          stroke="#22c55e"
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Green circle background with down chevron */}
      <View
        style={[
          styles.iconContainer,
          {
            width: circleRadius * 2,
            height: circleRadius * 2,
            borderRadius: circleRadius,
          },
        ]}
      >
        <Ionicons name="chevron-down" size={size * 0.4} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
  },
});
