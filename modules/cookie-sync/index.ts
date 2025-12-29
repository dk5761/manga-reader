import { requireNativeModule, Platform } from "expo-modules-core";

interface CookieResult {
  cookieString: string;
  count: number;
  domain: string;
}

interface CfClearanceResult {
  hasCfClearance: boolean;
  domain: string;
  cookieValue: string;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  isSecure: boolean;
  isHTTPOnly: boolean;
  expiresDate: number;
}

interface CookiesResult {
  cookies: Cookie[];
  domain: string;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  domain: string;
}

interface CookieSyncModuleType {
  getCookieString(url: string): Promise<CookieResult>;
  hasCfClearance(url: string): Promise<CfClearanceResult>;
  getCookiesFromWebView(url: string): Promise<CookiesResult>;
  syncCookiesToNative(url: string): Promise<SyncResult>;
}

// Only available on iOS
const CookieSyncModule: CookieSyncModuleType | null =
  Platform.OS === "ios" ? requireNativeModule("CookieSync") : null;

/**
 * Get cookie string from WKWebView for HTTP headers
 * iOS only - returns empty on other platforms
 */
export async function getCookieString(url: string): Promise<string> {
  if (!CookieSyncModule) {
    console.log("[CookieSync] Not available on this platform");
    return "";
  }
  const result = await CookieSyncModule.getCookieString(url);
  return result.cookieString;
}

/**
 * Check if cf_clearance cookie exists in WKWebView
 * iOS only - returns false on other platforms
 */
export async function hasCfClearance(url: string): Promise<boolean> {
  if (!CookieSyncModule) {
    return false;
  }
  const result = await CookieSyncModule.hasCfClearance(url);
  return result.hasCfClearance;
}

/**
 * Get all cookies from WKWebView for a domain
 * iOS only - returns empty array on other platforms
 */
export async function getCookiesFromWebView(url: string): Promise<Cookie[]> {
  if (!CookieSyncModule) {
    return [];
  }
  const result = await CookieSyncModule.getCookiesFromWebView(url);
  return result.cookies;
}

/**
 * Sync cookies from WKWebView to native HTTP storage
 * iOS only - no-op on other platforms
 */
export async function syncCookiesToNative(url: string): Promise<number> {
  if (!CookieSyncModule) {
    return 0;
  }
  const result = await CookieSyncModule.syncCookiesToNative(url);
  return result.syncedCount;
}

export default {
  getCookieString,
  hasCfClearance,
  getCookiesFromWebView,
  syncCookiesToNative,
};
