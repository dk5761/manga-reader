import { createContext, useContext, ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from "react-native-reanimated";

type HeaderContextType = {
  animated?: SharedValue<number>;
};

const HeaderContext = createContext<HeaderContextType>({});

export function useHeaderContext() {
  return useContext(HeaderContext);
}

type HeaderProps = {
  children: ReactNode;
  animated?: SharedValue<number>;
  className?: string;
  style?: object;
};

function HeaderRoot({ children, animated, className, style }: HeaderProps) {
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) return {};

    return {
      opacity: interpolate(animated.value, [0, 100], [0, 1], "clamp"),
      backgroundColor: `rgba(0, 0, 0, ${interpolate(
        animated.value,
        [0, 100],
        [0, 0.9],
        "clamp"
      )})`,
    };
  });

  const Container = animated ? Animated.View : View;

  return (
    <HeaderContext.Provider value={{ animated }}>
      <Container
        className={className}
        style={[
          {
            paddingTop: insets.top,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 12,
            minHeight: insets.top + 56,
          },
          animated ? animatedStyle : {},
          style,
        ]}
      >
        {children}
      </Container>
    </HeaderContext.Provider>
  );
}

export { HeaderRoot };
