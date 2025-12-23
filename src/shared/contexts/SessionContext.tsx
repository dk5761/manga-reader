import React, {
  createContext,
  useContext,
  useState,
  useCallback,
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
};

const SessionContext = createContext<SessionContextType | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

type WarmupConfig = {
  url: string;
  requireCfClearance: boolean;
};

/**
 * Provider that manages session warmup for manga sources.
 * Renders hidden WebViews to establish cookies before loading images.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [warmingConfigs, setWarmingConfigs] = useState<WarmupConfig[]>([]);
  const [readyUrls, setReadyUrls] = useState<Set<string>>(new Set());

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

  const handleWarmupReady = useCallback((baseUrl: string) => {
    console.log("[SessionProvider] Session ready for:", baseUrl);
    setReadyUrls((prev) => new Set([...prev, baseUrl]));
    setWarmingConfigs((prev) => prev.filter((c) => c.url !== baseUrl));
  }, []);

  return (
    <SessionContext.Provider value={{ isSessionReady, warmupSession }}>
      {children}
      {/* Render hidden WebViews for each URL being warmed up */}
      {warmingConfigs.map((config) => (
        <SessionWarmup
          key={config.url}
          url={config.url}
          onReady={() => handleWarmupReady(config.url)}
          timeout={config.requireCfClearance ? 20000 : 8000}
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
