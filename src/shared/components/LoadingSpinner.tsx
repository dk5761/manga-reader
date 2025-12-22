import { View, ActivityIndicator } from "react-native";
import { useCSSVariable } from "uniwind";

type LoadingSpinnerProps = {
  size?: "small" | "large";
  fullScreen?: boolean;
};

export function LoadingSpinner({
  size = "large",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const primaryColorRaw = useCSSVariable("--color-primary");
  const primaryColor =
    typeof primaryColorRaw === "string" ? primaryColorRaw : "#6366f1";

  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size={size} color={primaryColor} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={primaryColor} />;
}
