import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";
import { ReadingStatus } from "@/core/database";

const STATUS_OPTIONS: {
  value: ReadingStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    value: "reading",
    label: "Reading",
    icon: "book-outline",
    color: "#22c55e",
  },
  {
    value: "completed",
    label: "Completed",
    icon: "checkmark-circle-outline",
    color: "#3b82f6",
  },
  {
    value: "plan_to_read",
    label: "Plan to Read",
    icon: "time-outline",
    color: "#f59e0b",
  },
  {
    value: "on_hold",
    label: "On Hold",
    icon: "pause-circle-outline",
    color: "#6b7280",
  },
  {
    value: "dropped",
    label: "Dropped",
    icon: "close-circle-outline",
    color: "#ef4444",
  },
];

type ReadingStatusSheetProps = {
  visible: boolean;
  currentStatus: ReadingStatus;
  onSelect: (status: ReadingStatus) => void;
  onClose: () => void;
};

export function ReadingStatusSheet({
  visible,
  currentStatus,
  onSelect,
  onClose,
}: ReadingStatusSheetProps) {
  const foregroundColor = useCSSVariable("--color-foreground");
  const foreground =
    typeof foregroundColor === "string" ? foregroundColor : "#fff";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface rounded-t-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-muted/50 rounded-full" />
          </View>

          {/* Title */}
          <Text className="text-foreground text-lg font-bold px-4 pb-3">
            Reading Status
          </Text>

          {/* Options */}
          <View className="pb-6">
            {STATUS_OPTIONS.map((option) => {
              const isSelected = currentStatus === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  className="flex-row items-center px-4 py-4 active:bg-background/50"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={option.color}
                    />
                  </View>
                  <Text
                    className="flex-1 text-foreground font-medium"
                    style={isSelected ? { color: option.color } : undefined}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={22} color={option.color} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function getStatusLabel(status: ReadingStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label || "Reading";
}

export function getStatusColor(status: ReadingStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.color || "#22c55e";
}
