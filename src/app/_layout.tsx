import "../global.css";

import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@/core/providers";

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
