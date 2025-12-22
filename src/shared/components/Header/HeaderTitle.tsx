import { ReactNode } from "react";
import { Text, View } from "react-native";

type HeaderTitleProps = {
  children: ReactNode;
  className?: string;
};

export function HeaderTitle({ children, className }: HeaderTitleProps) {
  const isString = typeof children === "string";

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isString ? (
        <Text
          className={className}
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#fff",
          }}
          numberOfLines={1}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
