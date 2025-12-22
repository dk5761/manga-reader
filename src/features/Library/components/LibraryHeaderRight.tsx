import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";

export function LibraryHeaderRight() {
  const foregroundColor = useCSSVariable("--color-foreground");
  const color = typeof foregroundColor === "string" ? foregroundColor : "#fff";

  return (
    <View className="flex-row gap-2 mr-2">
      <Pressable onPress={() => {}} hitSlop={8} className="p-2">
        <Ionicons name="filter" size={22} color={color} />
      </Pressable>
      <Pressable onPress={() => {}} hitSlop={8} className="p-2">
        <Ionicons name="search" size={22} color={color} />
      </Pressable>
    </View>
  );
}
