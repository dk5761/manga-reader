/**
 * useKeepAwakeV2 Hook
 *
 * Keeps the screen awake while reading.
 */

import { useKeepAwake } from "expo-keep-awake";

/**
 * Simple wrapper to keep screen awake during reading
 */
export function useKeepAwakeV2() {
  useKeepAwake();
}
