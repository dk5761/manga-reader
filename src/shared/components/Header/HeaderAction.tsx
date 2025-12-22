import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type HeaderActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tintColor?: string;
  size?: number;
};

export function HeaderAction({
  icon,
  onPress,
  tintColor = "#fff",
  size = 22,
}: HeaderActionProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        padding: 8,
      })}
    >
      <Ionicons name={icon} size={size} color={tintColor} />
    </Pressable>
  );
}
