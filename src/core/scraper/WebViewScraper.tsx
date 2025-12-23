import React, {
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { HttpClient } from "../http";

export interface ScraperResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WebViewScraperRef {
  scrape: <T>(url: string, script: string) => Promise<ScraperResult<T>>;
  loadAndScrape: <T>(
    url: string,
    script: string,
    waitForSelector?: string
  ) => Promise<ScraperResult<T>>;
}

interface Props {
  onCookiesExtracted?: (
    domain: string,
    cookies: Record<string, string>
  ) => void;
}

/**
 * Invisible WebView component for scraping dynamic content
 * Uses injectedJavaScript to extract data and postMessage to return it
 */
export const WebViewScraper = forwardRef<WebViewScraperRef, Props>(
  ({ onCookiesExtracted }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const resolverRef = useRef<{
      resolve: (result: ScraperResult<unknown>) => void;
      reject: (error: Error) => void;
    } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);

          // Handle cookie extraction
          if (data.type === "cookies" && onCookiesExtracted) {
            onCookiesExtracted(data.domain, data.cookies);
            return;
          }

          // Handle scrape result
          if (data.type === "result" && resolverRef.current) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            resolverRef.current.resolve({
              success: true,
              data: data.data,
            });
            resolverRef.current = null;
          }

          // Handle error
          if (data.type === "error" && resolverRef.current) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            resolverRef.current.resolve({
              success: false,
              error: data.message,
            });
            resolverRef.current = null;
          }
        } catch (e) {
          console.warn("WebViewScraper: Failed to parse message", e);
        }
      },
      [onCookiesExtracted]
    );

    const scrape = useCallback(
      <T,>(url: string, script: string): Promise<ScraperResult<T>> => {
        return new Promise((resolve, reject) => {
          resolverRef.current = {
            resolve: resolve as (result: ScraperResult<unknown>) => void,
            reject,
          };

          // Set timeout
          timeoutRef.current = setTimeout(() => {
            if (resolverRef.current) {
              resolverRef.current.resolve({
                success: false,
                error: "Scrape timeout",
              });
              resolverRef.current = null;
            }
          }, 30000);

          // Inject scraping script
          const wrappedScript = `
            (function() {
              try {
                const result = (function() {
                  ${script}
                })();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'result',
                  data: result
                }));
              } catch (e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: e.message
                }));
              }
            })();
            true;
          `;

          webViewRef.current?.injectJavaScript(wrappedScript);
        });
      },
      []
    );

    const loadAndScrape = useCallback(
      <T,>(
        url: string,
        script: string,
        waitForSelector?: string
      ): Promise<ScraperResult<T>> => {
        return new Promise((resolve, reject) => {
          resolverRef.current = {
            resolve: resolve as (result: ScraperResult<unknown>) => void,
            reject,
          };

          // Set timeout
          timeoutRef.current = setTimeout(() => {
            if (resolverRef.current) {
              resolverRef.current.resolve({
                success: false,
                error: "Scrape timeout",
              });
              resolverRef.current = null;
            }
          }, 30000);

          // Build script that waits for element
          const waitScript = waitForSelector
            ? `
              const waitForElement = (selector, timeout = 10000) => {
                return new Promise((resolve, reject) => {
                  if (document.querySelector(selector)) {
                    return resolve(true);
                  }
                  const observer = new MutationObserver(() => {
                    if (document.querySelector(selector)) {
                      observer.disconnect();
                      resolve(true);
                    }
                  });
                  observer.observe(document.body, { childList: true, subtree: true });
                  setTimeout(() => {
                    observer.disconnect();
                    reject(new Error('Timeout waiting for ' + selector));
                  }, timeout);
                });
              };
              await waitForElement('${waitForSelector}');
            `
            : "";

          const injectedScript = `
            (async function() {
              try {
                ${waitScript}
                const result = (function() {
                  ${script}
                })();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'result',
                  data: result
                }));
              } catch (e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: e.message
                }));
              }
            })();
            true;
          `;

          // Load URL with injected script on load
          webViewRef.current?.injectJavaScript(`
            window.location.href = '${url}';
            true;
          `);

          // The actual scraping happens after page load via onLoadEnd
        });
      },
      []
    );

    useImperativeHandle(ref, () => ({
      scrape,
      loadAndScrape,
    }));

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: "about:blank" }}
          onMessage={handleMessage}
          userAgent={HttpClient.getUserAgent()}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          cacheEnabled
          style={styles.webview}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
  },
  webview: {
    width: 1,
    height: 1,
  },
});
