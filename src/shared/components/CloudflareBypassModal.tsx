import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { CookieManagerInstance } from "@/core/http/CookieManager";

type CloudflareBypassModalProps = {
  visible: boolean;
  url: string;
  onSuccess: (cookies: string) => void;
  onCancel: () => void;
};

/**
 * Full-screen modal for manual Cloudflare challenge solving.
 * Shown when automatic CF bypass fails after retries.
 *
 * User completes CF challenge in WebView, modal detects success,
 * extracts cookies, and passes them back to interceptor.
 */
export function CloudflareBypassModal({
  visible,
  url,
  onSuccess,
  onCancel,
}: CloudflareBypassModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  const webViewRef = useRef<WebView>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setCheckCount(0);
    }
  }, [visible]);

  /**
   * Inject JS to check if CF challenge is still present
   */
  const checkIfSolved = useCallback(() => {
    const checkScript = `
      (function() {
        try {
          const title = document.title || '';
          const body = document.body.innerHTML || '';
          
          const isCfChallenge = 
            title.toLowerCase().includes('just a moment') ||
            body.includes('cf-browser-verification') ||
            body.includes('challenge-running');
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'cfStatus',
            hasCfChallenge: isCfChallenge,
            url: window.location.href,
            title: title
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

    webViewRef.current?.injectJavaScript(checkScript);
  }, []);

  /**
   * Handle messages from WebView
   */
  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === "cfStatus") {
          console.log("[CF Modal] Challenge status:", {
            hasCfChallenge: data.hasCfChallenge,
            url: data.url,
            checkCount,
          });

          if (!data.hasCfChallenge) {
            // Challenge solved!
            console.log("[CF Modal] Challenge solved! Extracting cookies...");

            // Extract cookies
            const cookies = await CookieManagerInstance.extractFromWebView(url);

            if (cookies.length > 0) {
              const domain = new URL(url).hostname;
              await CookieManagerInstance.setCookies(domain, cookies);

              const cookieString = await CookieManagerInstance.getCookies(
                domain
              );

              if (cookieString) {
                console.log("[CF Modal] Cookies extracted successfully");
                onSuccess(cookieString);
              } else {
                console.warn("[CF Modal] No cookie string generated");
                // Try again after a delay
                setTimeout(checkIfSolved, 2000);
              }
            } else {
              console.warn("[CF Modal] No cookies extracted, retrying...");
              setTimeout(checkIfSolved, 2000);
            }
          } else {
            // Still has challenge, check again after delay
            setCheckCount((prev) => prev + 1);
          }
        } else if (data.type === "error") {
          console.error("[CF Modal] JS error:", data.error);
        }
      } catch (e) {
        console.error("[CF Modal] Failed to parse message:", e);
      }
    },
    [url, onSuccess, checkCount, checkIfSolved]
  );

  /**
   * Handle page load - check if solved
   */
  const handleLoadEnd = useCallback(() => {
    console.log("[CF Modal] Page loaded, checking challenge status...");
    setIsLoading(false);

    // Wait a bit for CF to render, then check
    setTimeout(checkIfSolved, 1000);
  }, [checkIfSolved]);

  /**
   * Handle navigation state change
   */
  const handleNavigationStateChange = useCallback(() => {
    // Check status on navigation
    setTimeout(checkIfSolved, 500);
  }, [checkIfSolved]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Verify You're Human</Text>
            <Text style={styles.subtitle}>
              Complete the verification below to continue
            </Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={styles.webviewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            onLoadEnd={handleLoadEnd}
            onNavigationStateChange={handleNavigationStateChange}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            style={styles.webview}
          />
        </View>

        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00d9ff" />
            <Text style={styles.loadingText}>Loading challenge...</Text>
          </View>
        )}

        {/* Status indicator */}
        {!isLoading && checkCount > 0 && (
          <View style={styles.statusBar}>
            <ActivityIndicator size="small" color="#00d9ff" />
            <Text style={styles.statusText}>
              Waiting for verification... (checked {checkCount} times)
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    color: "#00d9ff",
    fontWeight: "500",
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#fff",
  },
  statusBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  statusText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#999",
  },
});
