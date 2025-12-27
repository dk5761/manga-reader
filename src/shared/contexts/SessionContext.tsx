import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { SessionWarmup } from "../components/SessionWarmup";

type SessionState = {
  isReady: boolean;
  warmedUpUrls: Set<string>;
};

type SessionContextType = {
  isSessionReady: (baseUrl: string) => boolean;
  warmupSession: (baseUrl: string, requireCfClearance?: boolean) => void;
  waitForSession: (baseUrl: string, timeoutMs?: number) => Promise<boolean>;
  invalidateSession: (baseUrl: string) => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

type WarmupConfig = {
  url: string;
  requireCfClearance: boolean;
};

type WaitingCallback = {
  resolve: (ready: boolean) => void;
  timeoutId: NodeJS.Timeout;
};

/**
 * Provider that manages session warmup for manga sources.
 * Renders hidden WebViews to establish cookies before loading images.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [warmingConfigs, setWarmingConfigs] = useState<WarmupConfig[]>([]);
  const [readyUrls, setReadyUrls] = useState<Set<string>>(new Set());

  // Track callbacks waiting for sessions to be ready
  const waitingCallbacks = useRef<Map<string, WaitingCallback[]>>(new Map());

  const isSessionReady = useCallback(
    (baseUrl: string) => {
      return readyUrls.has(baseUrl);
    },
    [readyUrls]
  );

  const warmupSession = useCallback(
    (baseUrl: string, requireCfClearance = false) => {
      if (
        readyUrls.has(baseUrl) ||
        warmingConfigs.some((c) => c.url === baseUrl)
      ) {
        return; // Already ready or warming up
      }
      console.log(
        "[SessionProvider] Starting warmup for:",
        baseUrl,
        requireCfClearance ? "(needs CF clearance)" : ""
      );
      setWarmingConfigs((prev) => [
        ...prev,
        { url: baseUrl, requireCfClearance },
      ]);
    },
    [readyUrls, warmingConfigs]
  );

  /**
   * Wait for a session to be ready with timeout
   * Returns true if session is ready, false if timeout
   */
  const waitForSession = useCallback(
    (baseUrl: string, timeoutMs = 30000): Promise<boolean> => {
      // Already ready
      if (readyUrls.has(baseUrl)) {
        return Promise.resolve(true);
      }

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          // Remove from waiting list on timeout
          const callbacks = waitingCallbacks.current.get(baseUrl) || [];
          waitingCallbacks.current.set(
            baseUrl,
            callbacks.filter((cb) => cb.resolve !== resolve)
          );
          resolve(false);
        }, timeoutMs);

        // Add to waiting list
        const callbacks = waitingCallbacks.current.get(baseUrl) || [];
        callbacks.push({ resolve, timeoutId });
        waitingCallbacks.current.set(baseUrl, callbacks);
      });
    },
    [readyUrls]
  );

  /**
   * Invalidate a session (called when CF challenge is detected in response)
   * This removes the URL from ready set, triggering re-warmup on next access
   */
  const invalidateSession = useCallback((baseUrl: string) => {
    console.log("[SessionProvider] Invalidating session for:", baseUrl);
    setReadyUrls((prev) => {
      const newSet = new Set(prev);
      newSet.delete(baseUrl);
      return newSet;
    });
  }, []);

  const handleWarmupReady = useCallback((baseUrl: string) => {
    console.log("[SessionProvider] Session ready for:", baseUrl);
    setReadyUrls((prev) => new Set([...prev, baseUrl]));
    setWarmingConfigs((prev) => prev.filter((c) => c.url !== baseUrl));

    // Resolve all waiting callbacks for this URL
    const callbacks = waitingCallbacks.current.get(baseUrl) || [];
    callbacks.forEach((cb) => {
      clearTimeout(cb.timeoutId);
      cb.resolve(true);
    });
    waitingCallbacks.current.delete(baseUrl);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        isSessionReady,
        warmupSession,
        waitForSession,
        invalidateSession,
      }}
    >
      {children}
      {/* Render hidden WebViews for each URL being warmed up */}
      {warmingConfigs.map((config) => (
        <SessionWarmup
          key={config.url}
          url={config.url}
          onReady={() => handleWarmupReady(config.url)}
          requireCfClearance={config.requireCfClearance}
        />
      ))}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
