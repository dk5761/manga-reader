/**
 * StatusBanners - Loading and error banners for manga details
 * Pure presentational component
 */

import { View, Text, ActivityIndicator } from "react-native";

export type StatusBannersProps = {
  isRefreshing: boolean;
  hasError: boolean;
  hasLocalData: boolean;
};

export function StatusBanners({
  isRefreshing,
  hasError,
  hasLocalData,
}: StatusBannersProps) {
  return (
    <>
      {/* Loading Banner */}
      {isRefreshing && (
        <View className="bg-primary/10 border border-primary/30 mx-4 mt-2 mb-4 px-4 py-3 rounded-lg flex-row items-center">
          <ActivityIndicator size="small" color="#00d9ff" />
          <Text className="text-primary text-sm ml-3">Loading new data...</Text>
        </View>
      )}

      {/* Error Banner (if refresh failed but showing cached data) */}
      {hasLocalData && hasError && (
        <View className="bg-destructive/10 border border-destructive/30 mx-4 mt-2 mb-4 px-4 py-3 rounded-lg">
          <Text className="text-destructive text-sm">
            Failed to refresh - showing cached data
          </Text>
        </View>
      )}
    </>
  );
}
