import { ReactNode } from "react";
import { View } from "react-native";

type HeaderLeftProps = {
  children: ReactNode;
  className?: string;
};

export function HeaderLeft({ children, className }: HeaderLeftProps) {
  return (
    <View
      className={className}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minWidth: 48,
      }}
    >
      {children}
    </View>
  );
}
