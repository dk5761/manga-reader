/**
 * Notification service for sync completion alerts
 * Uses expo-notifications for local notifications
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { SyncResult } from "@/features/Library/stores/useSyncStore";

// Unique ID for sync progress notification (so we can update it)
const SYNC_PROGRESS_NOTIFICATION_ID = "sync-progress";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 * Call this on app startup
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Send/update sync progress notification
 * Shows: "Syncing MangaTitle (SourceName) - 3/10"
 */
export async function sendSyncProgressNotification(
  mangaTitle: string,
  sourceName: string,
  current: number,
  total: number
): Promise<void> {
  // Dismiss previous progress notification first
  await Notifications.dismissNotificationAsync(SYNC_PROGRESS_NOTIFICATION_ID);

  await Notifications.scheduleNotificationAsync({
    identifier: SYNC_PROGRESS_NOTIFICATION_ID,
    content: {
      title: `🔄 Syncing ${current}/${total}`,
      body: `${mangaTitle} (${sourceName})`,
      sound: false,
    },
    trigger: null, // Immediate
  });
}

/**
 * Dismiss sync progress notification
 * Call when sync completes
 */
export async function dismissSyncProgressNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(SYNC_PROGRESS_NOTIFICATION_ID);
}

/**
 * Send a local notification for sync completion
 */
export async function sendSyncCompletionNotification(
  result: SyncResult
): Promise<void> {
  // First dismiss progress notification
  await dismissSyncProgressNotification();

  const hasNewChapters = result.newChapters > 0;
  const hasFailures = result.failed.length > 0;

  let title: string;
  let body: string;

  if (hasNewChapters) {
    title = "📚 New Chapters Found!";
    body = `${result.updated} manga updated with ${result.newChapters} new chapters`;
  } else if (hasFailures) {
    title = "⚠️ Sync Complete with Errors";
    body = `${result.failed.length} failed to sync`;
  } else {
    title = "✅ Library Updated";
    body = "Your library is up to date";
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: false,
    },
    trigger: null, // Immediate
  });
}

/**
 * Clear all pending notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
