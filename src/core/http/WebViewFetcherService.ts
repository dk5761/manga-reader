/**
 * WebViewFetcher service for fetching HTML via hidden WebView.
 * Used for Cloudflare-protected sites where Axios can't pass the fingerprint check.
 *
 * The React context (WebViewFetcherProvider) registers its fetch function here,
 * allowing non-React code (like Source classes) to use WebView fetching.
 */

type FetchFunction = (url: string, timeoutMs?: number) => Promise<string>;

class WebViewFetcherServiceClass {
  private fetchFunction: FetchFunction | null = null;
  private pendingRequests: Array<{
    url: string;
    timeoutMs: number;
    resolve: (html: string) => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * Register the fetch function from WebViewFetcherProvider
   */
  register(fetchFn: FetchFunction) {
    console.log("[WebViewFetcherService] Registered");
    this.fetchFunction = fetchFn;

    // Process any pending requests
    while (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift();
      if (request) {
        this.fetchHtml(request.url, request.timeoutMs)
          .then(request.resolve)
          .catch(request.reject);
      }
    }
  }

  /**
   * Unregister the fetch function
   */
  unregister() {
    console.log("[WebViewFetcherService] Unregistered");
    this.fetchFunction = null;
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.fetchFunction !== null;
  }

  /**
   * Fetch HTML from URL using hidden WebView
   */
  async fetchHtml(url: string, timeoutMs = 30000): Promise<string> {
    if (!this.fetchFunction) {
      console.log(
        "[WebViewFetcherService] Not ready, queueing request:",
        url.substring(0, 60)
      );
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ url, timeoutMs, resolve, reject });

        // Timeout for pending requests
        setTimeout(() => {
          const index = this.pendingRequests.findIndex((r) => r.url === url);
          if (index !== -1) {
            this.pendingRequests.splice(index, 1);
            reject(new Error("WebViewFetcher not available"));
          }
        }, timeoutMs);
      });
    }

    console.log("[WebViewFetcherService] Fetching:", url.substring(0, 60));
    return this.fetchFunction(url, timeoutMs);
  }
}

export const WebViewFetcherService = new WebViewFetcherServiceClass();
