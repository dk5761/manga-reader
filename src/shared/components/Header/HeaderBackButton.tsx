import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type HeaderBackButtonProps = {
  tintColor?: string;
  onPress?: () => void;
};

export function HeaderBackButton({
  tintColor = "#fff",
  onPress,
}: HeaderBackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        padding: 8,
        marginLeft: -8,
      })}
    >
      <Ionicons name="chevron-back" size={24} color={tintColor} />
    </Pressable>
  );
}
