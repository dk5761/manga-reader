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

type FetchRequest = {
  id: string;
  url: string;
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type WebViewFetcherContextType = {
  fetchHtml: (url: string, timeoutMs?: number) => Promise<string>;
  isReady: boolean;
};

const WebViewFetcherContext = createContext<WebViewFetcherContextType | null>(
  null
);

// JavaScript to extract page HTML
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

type WebViewFetcherProviderProps = {
  children: ReactNode;
};

/**
 * Provider that manages a hidden WebView for fetching HTML from CF-protected sites.
 * Uses the same browser fingerprint that passed the CF challenge.
 */
export function WebViewFetcherProvider({
  children,
}: WebViewFetcherProviderProps) {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const requestQueueRef = useRef<FetchRequest[]>([]);
  const currentRequestRef = useRef<FetchRequest | null>(null);
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
      "[WebViewFetcher] Processing request:",
      request.url.substring(0, 60)
    );

    // Navigate to the URL
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.location.href = "${request.url}";
        true;
      `);
    }
  }, []);

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        const request = currentRequestRef.current;

        if (!request) {
          console.log(
            "[WebViewFetcher] Received message but no active request"
          );
          return;
        }

        if (data.type === "html") {
          console.log("[WebViewFetcher] Received HTML:", {
            url: data.url?.substring(0, 50),
            title: data.title,
            isCfChallenge: data.isCfChallenge,
            length: data.html?.length,
          });

          // Check if we're still on CF challenge
          if (data.isCfChallenge) {
            retryCountRef.current++;
            if (retryCountRef.current < maxRetries) {
              console.log(
                "[WebViewFetcher] Still on CF challenge, waiting... (retry",
                retryCountRef.current,
                ")"
              );
              // Wait and try again
              setTimeout(() => {
                if (webViewRef.current) {
                  webViewRef.current.injectJavaScript(EXTRACT_HTML_JS);
                }
              }, 2000);
              return;
            } else {
              console.log(
                "[WebViewFetcher] Max retries reached, returning CF page"
              );
            }
          }

          // Clear timeout and resolve
          clearTimeout(request.timeout);
          request.resolve(data.html);
          currentRequestRef.current = null;
          processNextRequest();
        } else if (data.type === "error") {
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

  // Handle load end - extract HTML
  const handleLoadEnd = useCallback(() => {
    const request = currentRequestRef.current;
    if (!request) return;

    console.log("[WebViewFetcher] Page loaded, extracting HTML");

    // Small delay to ensure page is fully rendered
    setTimeout(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(EXTRACT_HTML_JS);
      }
    }, 500);
  }, []);

  // Fetch HTML from a URL
  const fetchHtml = useCallback(
    (url: string, timeoutMs = 30000): Promise<string> => {
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);

        const timeout = setTimeout(() => {
          console.log(
            "[WebViewFetcher] Request timeout:",
            url.substring(0, 60)
          );
          // Remove from queue or clear current
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

        const request: FetchRequest = { id, url, resolve, reject, timeout };
        requestQueueRef.current.push(request);

        console.log(
          "[WebViewFetcher] Queued request:",
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

  // Register with the global service so non-React code can use it
  useEffect(() => {
    WebViewFetcherService.register(fetchHtml);
    return () => {
      WebViewFetcherService.unregister();
    };
  }, [fetchHtml]);

  return (
    <WebViewFetcherContext.Provider value={{ fetchHtml, isReady }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        <WebView
          ref={webViewRef}
          source={{ uri: "about:blank" }}
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
