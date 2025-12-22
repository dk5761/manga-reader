import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <Ionicons name={icon} size={64} color="#3f3f46" />
      <Text
        style={{
          color: "#a1a1aa",
          fontSize: 18,
          fontWeight: "600",
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            color: "#71717a",
            fontSize: 14,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {description}
        </Text>
      )}
    </View>
  );
}
