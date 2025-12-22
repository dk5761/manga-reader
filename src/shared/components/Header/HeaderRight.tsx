import { ReactNode } from "react";
import { View } from "react-native";

type HeaderRightProps = {
  children: ReactNode;
  className?: string;
};

export function HeaderRight({ children, className }: HeaderRightProps) {
  return (
    <View
      className={className}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: 48,
        gap: 8,
      }}
    >
      {children}
    </View>
  );
}
