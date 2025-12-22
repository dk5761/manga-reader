import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";

type SearchBarProps = {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchBar({
  placeholder = "Search...",
  value,
  onChangeText,
}: SearchBarProps) {
  const mutedColor = useCSSVariable("--color-muted");
  const placeholderColor =
    typeof mutedColor === "string" ? mutedColor : "#71717a";

  return (
    <View className="flex-row items-center bg-zinc-900 rounded-full px-4 py-2 gap-2 mx-4">
      <Ionicons name="search" size={20} color={placeholderColor} />
      <TextInput
        className="flex-1 text-foreground text-base asdh-full leading-none px"
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
        style={{ paddingVertical: 0 }} // Remove default padding for better vertical alignment
      />
    </View>
  );
}
