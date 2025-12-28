/**
 * Reader Debug Logger
 * Centralized logging with prefixes for easy filtering in console.
 *
 * Usage:
 *   readerLog.store('Initialized', { chapterId });
 *   readerLog.prefetch('Triggered', { direction: 'next' });
 *
 * Filter in console:
 *   [Reader:Store]   - Store state changes
 *   [Reader:Prefetch] - Prefetch triggers
 *   [Reader:Items]   - Items array building
 *   [Reader:Scroll]  - Scroll events
 *   [Reader:Chapter] - Chapter transitions
 *   [Reader:Mark]    - Mark as read events
 */

const IS_DEV = __DEV__;

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  store: "#4CAF50",
  prefetch: "#2196F3",
  items: "#9C27B0",
  scroll: "#FF9800",
  chapter: "#E91E63",
  mark: "#00BCD4",
  error: "#F44336",
} as const;

type LogCategory = keyof typeof LOG_COLORS;

function createLogger(category: LogCategory) {
  const prefix = `[Reader:${
    category.charAt(0).toUpperCase() + category.slice(1)
  }]`;

  return {
    debug: (message: string, data?: unknown) => {
      if (IS_DEV) {
        console.log(prefix, message, data !== undefined ? data : "");
      }
    },
    info: (message: string, data?: unknown) => {
      if (IS_DEV) {
        console.log(prefix, message, data !== undefined ? data : "");
      }
    },
    warn: (message: string, data?: unknown) => {
      console.warn(prefix, message, data !== undefined ? data : "");
    },
    error: (message: string, data?: unknown) => {
      console.error(prefix, message, data !== undefined ? data : "");
    },
  };
}

export const readerLog = {
  /** Store state changes */
  store: createLogger("store"),

  /** Prefetch triggers and loading */
  prefetch: createLogger("prefetch"),

  /** Items array building */
  items: createLogger("items"),

  /** Scroll events and position */
  scroll: createLogger("scroll"),

  /** Chapter transitions */
  chapter: createLogger("chapter"),

  /** Mark as read events */
  mark: createLogger("mark"),

  /** Errors */
  error: createLogger("error"),
};

/**
 * Performance logger for measuring operations
 */
export function createPerfLogger(operation: string) {
  const start = performance.now();
  return {
    end: (additionalData?: unknown) => {
      const duration = performance.now() - start;
      if (IS_DEV) {
        console.log(
          `[Reader:Perf] ${operation}`,
          `${duration.toFixed(2)}ms`,
          additionalData !== undefined ? additionalData : ""
        );
      }
    },
  };
}

/**
 * Log a state snapshot (useful for debugging)
 */
export function logStateSnapshot(
  label: string,
  state: Record<string, unknown>
) {
  if (IS_DEV) {
    console.group(`[Reader:Snapshot] ${label}`);
    Object.entries(state).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });
    console.groupEnd();
  }
}
