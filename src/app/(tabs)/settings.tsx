import { View, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-foreground text-2xl font-bold">More</Text>
      <Text className="text-muted mt-2">Settings & preferences</Text>
    </View>
  );
}
