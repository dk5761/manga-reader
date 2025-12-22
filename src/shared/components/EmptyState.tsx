import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
};

export function EmptyState({
  icon = "book-outline",
  title,
  description,
}: EmptyStateProps) {
  const iconColorRaw = useCSSVariable("--color-border-subtle");
  const iconColor = typeof iconColorRaw === "string" ? iconColorRaw : "#3f3f46";

  return (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name={icon} size={64} color={iconColor} />
      <Text className="text-foreground-secondary text-lg font-semibold mt-4 text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-muted text-sm mt-2 text-center">
          {description}
        </Text>
      )}
    </View>
  );
}
