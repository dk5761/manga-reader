import "../global.css";

import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { QueryProvider } from "@/core/providers";
import { SessionProvider } from "@/shared/contexts/SessionContext";
import { WebViewFetcherProvider } from "@/shared/contexts/WebViewFetcherContext";
import { DatabaseProvider } from "@/core/database";
import { UpdateScreen } from "@/shared/components/UpdateScreen";
import { CloudflareBypassModal } from "@/shared/components/CloudflareBypassModal";
import { ManualCfSolver } from "@/core/http/ManualCfSolver";
import { requestNotificationPermissions } from "@/shared/services/notifications";

// Keep splash screen visible while app loads
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // CloudflareBypassModal state
  const [cfBypassState, setCfBypassState] = useState<{
    visible: boolean;
    url: string;
  }>({ visible: false, url: "" });

  // Request notification permissions and hide splash on startup
  useEffect(() => {
    requestNotificationPermissions();
    // Hide splash screen after a brief delay to ensure providers are ready
    SplashScreen.hideAsync();
  }, []);

  // Listen to ManualCfSolver events
  useEffect(() => {
    const showListener = (data: { url: string }) => {
      setCfBypassState({ visible: true, url: data.url });
    };

    const hideListener = () => {
      setCfBypassState({ visible: false, url: "" });
    };

    ManualCfSolver.on("show", showListener);
    ManualCfSolver.on("hide", hideListener);

    return () => {
      ManualCfSolver.off("show", showListener);
      ManualCfSolver.off("hide", hideListener);
    };
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <DatabaseProvider>
          <QueryProvider>
            <SessionProvider>
              <WebViewFetcherProvider>
                <Stack
                  screenOptions={{
                    headerShown: true,
                    headerStyle: {
                      backgroundColor: isDark ? "#0a0a0f" : "#ffffff",
                    },
                    headerTintColor: isDark ? "#fff" : "#000",
                    headerTitleStyle: { fontWeight: "600" },
                    headerShadowVisible: false,
                    headerBackTitle: "",
                  }}
                >
                  {/* Hide header for tabs - tabs have their own headers */}
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false, title: "" }}
                  />
                  {/* Hide header for reader - full screen experience */}
                  <Stack.Screen
                    name="reader/[chapterId]"
                    options={{ headerShown: false }}
                  />
                </Stack>

                {/* Force Update Screen - blocks app until update is applied */}
                <UpdateScreen />

                {/* Cloudflare Bypass Modal - globally available */}
                <CloudflareBypassModal
                  visible={cfBypassState.visible}
                  url={cfBypassState.url}
                  onSuccess={(cookies) => ManualCfSolver.handleSuccess(cookies)}
                  onCancel={() => ManualCfSolver.handleCancel()}
                />
              </WebViewFetcherProvider>
            </SessionProvider>
          </QueryProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
