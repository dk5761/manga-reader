import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

type TabBarConfig = {
  icons?: Record<string, keyof typeof Ionicons.glyphMap>;
};

const defaultIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  library: "book",
  browse: "compass-outline",
  updates: "time-outline",
  settings: "ellipsis-horizontal",
};

// Fallback colors
const FALLBACK_ACTIVE = "#22d3ee";
const FALLBACK_INACTIVE = "#94a3b8";

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
  config = {},
}: BottomTabBarProps & { config?: TabBarConfig }) {
  const insets = useSafeAreaInsets();
  const icons = { ...defaultIcons, ...config.icons };

  // Get theme-aware colors with fallbacks
  const [activeColor, inactiveColor] = useCSSVariable([
    "--color-tab-active",
    "--color-tab-inactive",
  ]);

  const getColor = (isFocused: boolean): string => {
    const color = isFocused ? activeColor : inactiveColor;
    if (typeof color === "string") return color;
    return isFocused ? FALLBACK_ACTIVE : FALLBACK_INACTIVE;
  };

  return (
    <View className="absolute left-6 right-6" style={{ bottom: insets.bottom }}>
      <View className="flex-row bg-tab-bg rounded-lg border border-tab-border h-[70px] items-center px-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const color = getColor(isFocused);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center justify-center py-2"
            >
              <Ionicons
                name={icons[route.name] ?? "help-circle"}
                size={22}
                color={color}
              />
              <Text className="text-xs font-medium mt-1" style={{ color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
