/**
 * SyncProgressBanner - Floating banner showing sync progress
 * Displays current manga being synced and progress count
 */

import { View, Text } from "react-native";
import { useSyncStore } from "../stores/useSyncStore";

export function SyncProgressBanner() {
  const { isSyncing, progress, currentSource, currentManga } = useSyncStore();

  if (!isSyncing) return null;

  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <View className="mx-4 mb-4 bg-primary/15 border border-primary/30 rounded-lg overflow-hidden">
      {/* Progress bar background */}
      <View
        className="absolute inset-y-0 left-0 bg-primary/20"
        style={{ width: `${percent}%` }}
      />

      {/* Content */}
      <View className="p-3 relative">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Text className="text-primary text-sm font-semibold">
              🔄 Updating library...
            </Text>
          </View>
          <Text className="text-primary/80 text-sm font-medium">
            {progress.current}/{progress.total}
          </Text>
        </View>

        {currentManga && (
          <Text className="text-muted text-xs mt-1" numberOfLines={1}>
            {currentSource}: {currentManga}
          </Text>
        )}
      </View>
    </View>
  );
}
