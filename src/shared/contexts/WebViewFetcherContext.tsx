import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { View, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { HttpClient } from "@/core/http";
import { WebViewFetcherService } from "@/core/http/WebViewFetcherService";
import { useSession } from "./SessionContext";

type RequestType = "navigate" | "post";

type FetchRequest = {
  id: string;
  type: RequestType;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  // For POST: whether we've navigated to domain first
  domainReady?: boolean;
};

type WebViewFetcherContextType = {
  fetchHtml: (url: string, timeoutMs?: number) => Promise<string>;
  postHtml: (
    url: string,
    body?: string,
    headers?: Record<string, string>,
    timeoutMs?: number
  ) => Promise<string>;
  isReady: boolean;
};

const WebViewFetcherContext = createContext<WebViewFetcherContextType | null>(
  null
);

// JavaScript to extract page HTML after navigation
const EXTRACT_HTML_JS = `
(function() {
  try {
    var html = document.documentElement.outerHTML;
    var title = document.title || '';
    var isCfChallenge = title.toLowerCase().includes('just a moment') ||
                        html.includes('cf-browser-verification') ||
                        html.includes('challenge-running');
    
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'html',
      html: html,
      title: title,
      isCfChallenge: isCfChallenge,
      url: window.location.href
    }));
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'error',
      error: e.message
    }));
  }
})();
true;
`;

// Generate JavaScript for POST request via fetch API
const createPostScript = (
  url: string,
  body?: string,
  headers?: Record<string, string>
) => {
  const headersObj = {
    "X-Requested-With": "XMLHttpRequest",
    ...headers,
  };

  // Escape the body properly for JS string
  const bodyStr = body ? body.replace(/"/g, '\\"') : "";

  return `
(async function() {
  try {
    console.log('[WebViewFetcher JS] Starting POST to:', "${url}");
    const response = await fetch("${url}", {
      method: "POST",
      headers: ${JSON.stringify(headersObj)},
      body: "${bodyStr}",
      credentials: "include"
    });
    console.log('[WebViewFetcher JS] POST response status:', response.status);
    const html = await response.text();
    console.log('[WebViewFetcher JS] POST response length:', html.length);
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'postResponse',
      html: html,
      status: response.status,
      url: "${url}"
    }));
  } catch(e) {
    console.log('[WebViewFetcher JS] POST error:', e.message);
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'postError',
      error: e.message,
      url: "${url}"
    }));
  }
})();
true;
`;
};

// JavaScript to signal domain is ready for fetch requests
const DOMAIN_READY_CHECK_JS = `
(function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'domainReady',
    url: window.location.href,
    origin: window.location.origin
  }));
})();
true;
`;

type WebViewFetcherProviderProps = {
  children: ReactNode;
};

// Extract origin from URL
const getOrigin = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

/**
 * Provider that manages a hidden WebView for fetching HTML from CF-protected sites.
 * Supports both GET (navigation) and POST (fetch API) requests.
 */
export function WebViewFetcherProvider({
  children,
}: WebViewFetcherProviderProps) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const requestQueueRef = useRef<FetchRequest[]>([]);
  const currentRequestRef = useRef<FetchRequest | null>(null);
  const currentOriginRef = useRef<string>("https://localhost");
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Process next request in queue
  const processNextRequest = useCallback(() => {
    if (currentRequestRef.current || requestQueueRef.current.length === 0) {
      return;
    }

    const request = requestQueueRef.current.shift();
    if (!request) return;

    currentRequestRef.current = request;
    retryCountRef.current = 0;
    console.log(
      "[WebViewFetcher] Processing",
      request.type.toUpperCase(),
      "request:",
      request.url.substring(0, 60)
    );

    if (webViewRef.current) {
      if (request.type === "navigate") {
        // Navigate to URL for GET requests
        webViewRef.current.injectJavaScript(`
          window.location.href = "${request.url}";
          true;
        `);
      } else if (request.type === "post") {
        const targetOrigin = getOrigin(request.url);

        // Check if we're on the correct origin for the POST request
        if (currentOriginRef.current === targetOrigin) {
          // Already on correct domain, execute POST immediately
          console.log("[WebViewFetcher] Already on domain, executing POST");
          request.domainReady = true;
          const script = createPostScript(
            request.url,
            request.body,
            request.headers
          );
          webViewRef.current.injectJavaScript(script);
        } else {
          // Need to navigate to domain first
          console.log(
            "[WebViewFetcher] Navigating to domain first:",
            targetOrigin
          );
          request.domainReady = false;
          webViewRef.current.injectJavaScript(`
            window.location.href = "${targetOrigin}/";
            true;
          `);
        }
      }
    }
  }, []);

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        const request = currentRequestRef.current;

        console.log("[WebViewFetcher] Message:", data.type);

        if (!request) {
          console.log(
            "[WebViewFetcher] Received message but no active request"
          );
          return;
        }

        // Handle navigation response (GET)
        if (data.type === "html") {
          console.log("[WebViewFetcher] Received HTML:", {
            url: data.url?.substring(0, 50),
            title: data.title,
            isCfChallenge: data.isCfChallenge,
            length: data.html?.length,
          });

          if (data.isCfChallenge) {
            retryCountRef.current++;
            if (retryCountRef.current < maxRetries) {
              console.log("[WebViewFetcher] Still on CF challenge, waiting...");
              setTimeout(() => {
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(EXTRACT_HTML_JS);
                }
              }, 2000);
              return;
            }
          }

          clearTimeout(request.timeout);
          request.resolve(data.html);
          currentRequestRef.current = null;
          processNextRequest();
        }
        // Handle domain ready (for POST after navigation)
        else if (data.type === "domainReady") {
          console.log("[WebViewFetcher] Domain ready:", data.origin);
          currentOriginRef.current = data.origin || "";

          // If this is a POST request waiting for domain, execute it now
          if (
            request.type === "post" &&
            !request.domainReady &&
            webViewRef.current
          ) {
            console.log("[WebViewFetcher] Domain ready, executing POST now");
            request.domainReady = true;
            const script = createPostScript(
              request.url,
              request.body,
              request.headers
            );
            webViewRef.current.injectJavaScript(script);
          }
        }
        // Handle POST response
        else if (data.type === "postResponse") {
          console.log("[WebViewFetcher] POST response:", {
            url: data.url?.substring(0, 50),
            status: data.status,
            length: data.html?.length,
          });

          clearTimeout(request.timeout);
          request.resolve(data.html);
          currentRequestRef.current = null;
          processNextRequest();
        }
        // Handle POST error
        else if (data.type === "postError") {
          console.warn("[WebViewFetcher] POST error:", data.error);
          clearTimeout(request.timeout);
          request.reject(new Error(data.error));
          currentRequestRef.current = null;
          processNextRequest();
        }
        // Handle general JS error
        else if (data.type === "error") {
          console.warn("[WebViewFetcher] JS error:", data.error);
          clearTimeout(request.timeout);
          request.reject(new Error(data.error));
          currentRequestRef.current = null;
          processNextRequest();
        }
      } catch (e) {
        console.warn("[WebViewFetcher] Failed to parse message:", e);
      }
    },
    [processNextRequest]
  );

  // Handle load end - extract HTML for navigation requests, or signal domain ready for POST
  const handleLoadEnd = useCallback(() => {
    const request = currentRequestRef.current;

    console.log("[WebViewFetcher] Page loaded");

    if (!request) return;

    if (request.type === "navigate") {
      console.log("[WebViewFetcher] Navigate request, extracting HTML");
      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(EXTRACT_HTML_JS);
        }
      }, 500);
    } else if (request.type === "post" && !request.domainReady) {
      // Domain loaded, now we can execute the POST
      console.log("[WebViewFetcher] POST domain loaded, signaling ready");
      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(DOMAIN_READY_CHECK_JS);
        }
      }, 500);
    }
  }, []);

  // GET request via navigation
  const fetchHtml = useCallback(
    (url: string, timeoutMs = 30000): Promise<string> => {
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);

        const timeout = setTimeout(() => {
          console.log(
            "[WebViewFetcher] Request timeout:",
            url.substring(0, 60)
          );
          if (currentRequestRef.current?.id === id) {
            currentRequestRef.current = null;
            processNextRequest();
          } else {
            requestQueueRef.current = requestQueueRef.current.filter(
              (r) => r.id !== id
            );
          }
          reject(new Error("WebView fetch timeout"));
        }, timeoutMs);

        const request: FetchRequest = {
          id,
          type: "navigate",
          url,
          resolve,
          reject,
          timeout,
        };
        requestQueueRef.current.push(request);

        console.log(
          "[WebViewFetcher] Queued GET request:",
          url.substring(0, 60),
          "Queue size:",
          requestQueueRef.current.length
        );
        processNextRequest();
      });
    },
    [processNextRequest]
  );

  // POST request via fetch API
  const postHtml = useCallback(
    (
      url: string,
      body?: string,
      headers?: Record<string, string>,
      timeoutMs = 30000
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);

        const timeout = setTimeout(() => {
          console.log("[WebViewFetcher] POST timeout:", url.substring(0, 60));
          if (currentRequestRef.current?.id === id) {
            currentRequestRef.current = null;
            processNextRequest();
          } else {
            requestQueueRef.current = requestQueueRef.current.filter(
              (r) => r.id !== id
            );
          }
          reject(new Error("WebView POST timeout"));
        }, timeoutMs);

        const request: FetchRequest = {
          id,
          type: "post",
          url,
          body,
          headers,
          resolve,
          reject,
          timeout,
          domainReady: false,
        };
        requestQueueRef.current.push(request);

        console.log(
          "[WebViewFetcher] Queued POST request:",
          url.substring(0, 60),
          "Queue size:",
          requestQueueRef.current.length
        );
        processNextRequest();
      });
    },
    [processNextRequest]
  );

  // Mark as ready when WebView is mounted
  const handleWebViewLoad = useCallback(() => {
    console.log("[WebViewFetcher] WebView ready");
    setIsReady(true);
  }, []);

  // Get invalidateSession from SessionContext
  const { invalidateSession } = useSession();

  // Register with the global service so non-React code can use it
  useEffect(() => {
    WebViewFetcherService.register(fetchHtml, postHtml, invalidateSession);
    return () => {
      WebViewFetcherService.unregister();
    };
  }, [fetchHtml, postHtml, invalidateSession]);

  return (
    <WebViewFetcherContext.Provider value={{ fetchHtml, postHtml, isReady }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{
            html: "<html><body></body></html>",
            baseUrl: "https://localhost/",
          }}
          style={styles.webview}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          onLoad={handleWebViewLoad}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          userAgent={HttpClient.getUserAgent()}
        />
      </View>
    </WebViewFetcherContext.Provider>
  );
}

export function useWebViewFetcher() {
  const context = useContext(WebViewFetcherContext);
  if (!context) {
    throw new Error(
      "useWebViewFetcher must be used within a WebViewFetcherProvider"
    );
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
  },
});
