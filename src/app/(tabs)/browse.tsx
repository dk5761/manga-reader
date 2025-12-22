import { View, Text } from "react-native";

export default function BrowseScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-2xl font-bold">Browse</Text>
      <Text className="text-muted mt-2">Discover new manga</Text>
    </View>
  );
}
