import { View, Text } from "react-native";

export default function UpdatesScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-2xl font-bold">History</Text>
      <Text className="text-muted mt-2">Your reading history</Text>
    </View>
  );
}
