import { useKeepAwake } from "expo-keep-awake";

/**
 * Keep screen awake during reading session.
 * Automatically activates on mount, deactivates on unmount.
 */
export function useReaderKeepAwake() {
  useKeepAwake("reader");
}
