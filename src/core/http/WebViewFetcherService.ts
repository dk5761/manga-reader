/**
 * WebViewFetcher service for fetching HTML via hidden WebView.
 * Used for Cloudflare-protected sites where Axios can't pass the fingerprint check.
 *
 * The React context (WebViewFetcherProvider) registers its fetch function here,
 * allowing non-React code (like Source classes) to use WebView fetching.
 */

type FetchFunction = (url: string, timeoutMs?: number) => Promise<string>;
type PostFunction = (
  url: string,
  body?: string,
  headers?: Record<string, string>,
  timeoutMs?: number
) => Promise<string>;

type PendingRequest = {
  url: string;
  timeoutMs: number;
  resolve: (html: string) => void;
  reject: (error: Error) => void;
};

type PendingPostRequest = {
  url: string;
  body?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  resolve: (html: string) => void;
  reject: (error: Error) => void;
};

class WebViewFetcherServiceClass {
  private fetchFunction: FetchFunction | null = null;
  private postFunction: PostFunction | null = null;
  private pendingFetchRequests: PendingRequest[] = [];
  private pendingPostRequests: PendingPostRequest[] = [];

  /**
   * Register the fetch functions from WebViewFetcherProvider
   */
  register(fetchFn: FetchFunction, postFn: PostFunction) {
    console.log("[WebViewFetcherService] Registered");
    this.fetchFunction = fetchFn;
    this.postFunction = postFn;

    // Process any pending fetch requests
    while (this.pendingFetchRequests.length > 0) {
      const request = this.pendingFetchRequests.shift();
      if (request) {
        this.fetchHtml(request.url, request.timeoutMs)
          .then(request.resolve)
          .catch(request.reject);
      }
    }

    // Process any pending POST requests
    while (this.pendingPostRequests.length > 0) {
      const request = this.pendingPostRequests.shift();
      if (request) {
        this.postHtml(
          request.url,
          request.body,
          request.headers,
          request.timeoutMs
        )
          .then(request.resolve)
          .catch(request.reject);
      }
    }
  }

  /**
   * Unregister the fetch functions
   */
  unregister() {
    console.log("[WebViewFetcherService] Unregistered");
    this.fetchFunction = null;
    this.postFunction = null;
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.fetchFunction !== null && this.postFunction !== null;
  }

  /**
   * Fetch HTML from URL using hidden WebView (GET request via navigation)
   */
  async fetchHtml(url: string, timeoutMs = 30000): Promise<string> {
    if (!this.fetchFunction) {
      console.log(
        "[WebViewFetcherService] Not ready, queueing fetch request:",
        url.substring(0, 60)
      );
      return new Promise((resolve, reject) => {
        this.pendingFetchRequests.push({ url, timeoutMs, resolve, reject });

        // Timeout for pending requests
        setTimeout(() => {
          const index = this.pendingFetchRequests.findIndex(
            (r) => r.url === url
          );
          if (index !== -1) {
            this.pendingFetchRequests.splice(index, 1);
            reject(new Error("WebViewFetcher not available"));
          }
        }, timeoutMs);
      });
    }

    console.log("[WebViewFetcherService] Fetching:", url.substring(0, 60));
    return this.fetchFunction(url, timeoutMs);
  }

  /**
   * POST request via WebView's JavaScript fetch (uses WebView's cookies/fingerprint)
   */
  async postHtml(
    url: string,
    body?: string,
    headers?: Record<string, string>,
    timeoutMs = 30000
  ): Promise<string> {
    if (!this.postFunction) {
      console.log(
        "[WebViewFetcherService] Not ready, queueing POST request:",
        url.substring(0, 60)
      );
      return new Promise((resolve, reject) => {
        this.pendingPostRequests.push({
          url,
          body,
          headers,
          timeoutMs,
          resolve,
          reject,
        });

        setTimeout(() => {
          const index = this.pendingPostRequests.findIndex(
            (r) => r.url === url
          );
          if (index !== -1) {
            this.pendingPostRequests.splice(index, 1);
            reject(new Error("WebViewFetcher not available"));
          }
        }, timeoutMs);
      });
    }

    console.log("[WebViewFetcherService] POSTing:", url.substring(0, 60));
    return this.postFunction(url, body, headers, timeoutMs);
  }
}

export const WebViewFetcherService = new WebViewFetcherServiceClass();
