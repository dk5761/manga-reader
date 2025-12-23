import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Simplified source card type (not the full Extension type)
export type SourceCardData = {
  id: string;
  name: string;
  icon: string;
  language?: string;
};

type SourceCardProps = {
  source: SourceCardData;
  onView?: () => void;
};

export function SourceCard({ source, onView }: SourceCardProps) {
  return (
    <View className="flex-row items-center px-4 py-3 gap-3">
      {/* Icon */}
      <Image
        source={{ uri: source.icon }}
        className="w-12 h-12 rounded-full bg-surface"
        resizeMode="cover"
      />

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-foreground text-sm font-semibold"
            numberOfLines={1}
          >
            {source.name}
          </Text>
          {source.language && (
            <View className="bg-surface px-1.5 py-0.5 rounded">
              <Text className="text-muted text-[10px] font-medium">
                {source.language}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* View button */}
      <Pressable onPress={onView} className="px-5 py-2 rounded-lg bg-primary">
        <Text className="text-black text-xs font-semibold">Browse</Text>
      </Pressable>
    </View>
  );
}
