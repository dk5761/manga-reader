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
  badge?: string; // e.g. "COMPLETED"
  progress?: number; // 0 to 100
  subtitle?: string; // e.g. "Ch. 164"
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MangaCardComponent({
  id,
  title,
  coverUrl,
  onPress,
  badge,
  progress,
  subtitle,
}: MangaCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="w-full flex-col gap-2"
      style={[animatedStyle]}
    >
      {/* Cover Image Container */}
      <View className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800">
        <Image
          source={{ uri: coverUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />

        {/* Badge - Top Left */}
        {badge && (
          <View className="absolute top-2 left-2 px-2 py-1 bg-green-500 rounded-md">
            <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
              {badge}
            </Text>
          </View>
        )}

        {/* Unread Badge - Top Right (Optional logic kept if needed, but using Badge prop mostly) */}
      </View>

      {/* Info Section */}
      <View className="flex-col gap-1">
        <Text
          className="text-white text-sm font-bold leading-tight"
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Progress Bar */}
        {progress !== undefined && (
          <View className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </View>
        )}

        {/* Metadata Row */}
        {(subtitle || progress !== undefined) && (
          <View className="flex-row items-center justify-between">
            <Text
              className="text-zinc-500 text-[10px] font-medium"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
            {progress !== undefined && (
              <Text className="text-zinc-500 text-[10px] font-medium">
                {progress}%
              </Text>
            )}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

export const MangaCard = memo(MangaCardComponent);
