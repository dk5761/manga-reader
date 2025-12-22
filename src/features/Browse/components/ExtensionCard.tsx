import { View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Extension } from "../data/mockData";

type ExtensionCardProps = {
  extension: Extension;
  onView?: () => void;
};

export function ExtensionCard({ extension, onView }: ExtensionCardProps) {
  return (
    <View className="flex-row items-center px-4 py-3 gap-3">
      {/* Icon with status indicator */}
      <View className="relative">
        <Image
          source={{ uri: extension.icon }}
          className="w-12 h-12 rounded-full bg-surface"
          resizeMode="cover"
        />
        {/* Status indicator */}
        {extension.installed && !extension.hasUpdate && (
          <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full items-center justify-center border-2 border-background">
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
        {extension.hasUpdate && (
          <View className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full items-center justify-center border-2 border-background">
            <Ionicons name="alert" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-foreground text-sm font-semibold"
            numberOfLines={1}
          >
            {extension.name}
          </Text>
          <View className="bg-surface px-1.5 py-0.5 rounded">
            <Text className="text-muted text-[10px] font-medium">
              {extension.language}
            </Text>
          </View>
        </View>
      </View>

      {/* View button */}
      <Pressable onPress={onView} className="px-5 py-2 rounded-lg bg-primary">
        <Text className="text-black text-xs font-semibold">View</Text>
      </Pressable>
    </View>
  );
}
