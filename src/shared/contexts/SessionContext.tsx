import React, {
  createContext,
  useContext,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { CookieManagerInstance } from "@/core/http/CookieManager";

/**
 * Simplified SessionContext for Mihon-style architecture.
 * No warmup needed - CookieManager loads from AsyncStorage automatically.
 */

type SessionContextType = {
  invalidateSession: (baseUrl: string) => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

/**
 * Provider that initializes cookie management.
 * No warmup needed - cookies loaded from AsyncStorage on demand.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  // Load cookies from storage on mount
  useEffect(() => {
    CookieManagerInstance.load();
  }, []);

  /**
   * Invalidate session (clear cookies for a domain)
   * Called when CF challenge is detected or on manual logout
   */
  const invalidateSession = useCallback((baseUrl: string) => {
    try {
      const domain = new URL(baseUrl).hostname;
      console.log("[SessionProvider] Invalidating session for:", domain);
      CookieManagerInstance.clearDomain(domain);
    } catch (e) {
      console.error("[SessionProvider] Failed to invalidate session:", e);
    }
  }, []);

  return (
    <SessionContext.Provider value={{ invalidateSession }}>
      {children}
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
