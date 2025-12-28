/**
 * HTTP types for network layer
 */

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface StoredCookies {
  cookies: Cookie[];
  cookieString: string;
  expiry: number;
  domain: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  method?: "GET" | "POST";
  body?: string;
}

export class CloudflareBypassException extends Error {
  constructor(
    message: string,
    public readonly attempts: number = 0,
    public readonly url: string = ""
  ) {
    super(message);
    this.name = "CloudflareBypassException";
  }
}
