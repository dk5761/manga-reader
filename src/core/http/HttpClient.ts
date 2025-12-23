import AsyncStorage from "@react-native-async-storage/async-storage";

const COOKIE_STORAGE_KEY = "http_cookies";
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

interface CookieJar {
  [domain: string]: {
    [name: string]: {
      value: string;
      expires?: number;
    };
  };
}

class HttpClientClass {
  private cookieJar: CookieJar = {};
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(COOKIE_STORAGE_KEY);
      if (stored) {
        this.cookieJar = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load cookies:", e);
    }
    this.initialized = true;
  }

  private async saveCookies(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        COOKIE_STORAGE_KEY,
        JSON.stringify(this.cookieJar)
      );
    } catch (e) {
      console.warn("Failed to save cookies:", e);
    }
  }

  private getDomain(url: string): string {
    const match = url.match(/^https?:\/\/([^/]+)/);
    return match ? match[1] : "";
  }

  private getCookiesForUrl(url: string): string {
    const domain = this.getDomain(url);
    const cookies = this.cookieJar[domain];
    if (!cookies) return "";

    const now = Date.now();
    return Object.entries(cookies)
      .filter(([_, cookie]) => !cookie.expires || cookie.expires > now)
      .map(([name, cookie]) => `${name}=${cookie.value}`)
      .join("; ");
  }

  setCookies(domain: string, cookies: Record<string, string>): void {
    if (!this.cookieJar[domain]) {
      this.cookieJar[domain] = {};
    }
    for (const [name, value] of Object.entries(cookies)) {
      this.cookieJar[domain][name] = { value };
    }
    this.saveCookies();
  }

  getCookies(domain: string): Record<string, string> {
    const cookies = this.cookieJar[domain];
    if (!cookies) return {};
    return Object.fromEntries(
      Object.entries(cookies).map(([name, cookie]) => [name, cookie.value])
    );
  }

  clearCookies(domain?: string): void {
    if (domain) {
      delete this.cookieJar[domain];
    } else {
      this.cookieJar = {};
    }
    this.saveCookies();
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    await this.init();

    const headers = new Headers(options.headers);

    // Set default headers
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", USER_AGENT);
    }

    // Add cookies
    const cookies = this.getCookiesForUrl(url);
    if (cookies) {
      headers.set("Cookie", cookies);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse Set-Cookie headers (simplified)
    const setCookie = response.headers.get("Set-Cookie");
    if (setCookie) {
      const domain = this.getDomain(url);
      const cookieParts = setCookie.split(";")[0].split("=");
      if (cookieParts.length >= 2) {
        this.setCookies(domain, { [cookieParts[0]]: cookieParts[1] });
      }
    }

    return response;
  }

  async getText(url: string, options?: RequestInit): Promise<string> {
    const response = await this.fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  }

  async getJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await this.fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  getUserAgent(): string {
    return USER_AGENT;
  }
}

export const HttpClient = new HttpClientClass();
