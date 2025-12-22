import { View, Text } from "react-native";

export default function LibraryScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-2xl font-bold">Library</Text>
      <Text className="text-muted mt-2">Your manga collection</Text>
    </View>
  );
}
