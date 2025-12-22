import { memo } from "react";
import { View, Text, Pressable, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

type MangaCardProps = {
  id: string;
  title: string;
  coverUrl: string;
  onPress?: () => void;
  unreadCount?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MangaCardComponent({
  id,
  title,
  coverUrl,
  onPress,
  unreadCount,
}: MangaCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          width: "100%",
          aspectRatio: 0.7,
          borderRadius: 8,
          overflow: "hidden",
        },
        animatedStyle,
      ]}
    >
      <Image
        source={{ uri: coverUrl }}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#27272a",
        }}
        resizeMode="cover"
      />

      {/* Gradient overlay - simulated with stacked views */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.1)" }} />
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} />
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }} />
      </View>

      {/* Title */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 8,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: "600",
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>

      {/* Unread badge */}
      {unreadCount && unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            backgroundColor: "#6366f1",
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {unreadCount}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export const MangaCard = memo(MangaCardComponent);
