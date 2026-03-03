import { request } from "undici";
import { HomeAssistantApiError, HomeAssistantConnectionError, HomeAssistantReadOnlyError, HomeAssistantTimeoutError } from "./errors.js";
import type { Config } from "../types/options.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export abstract class BaseClient {
  protected readonly baseUrl: string;
  protected readonly token: string;
  protected readonly timeout: number;
  protected readonly readOnly: boolean;
  protected readonly retryConfig: RetryConfig;

  constructor(config: Config, retryConfig?: Partial<RetryConfig>) {
    this.baseUrl = config.url;
    this.token = config.token;
    this.timeout = config.timeout;
    this.readOnly = config.readOnly;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  private assertMethodAllowed(method: HttpMethod, path: string): void {
    if (this.readOnly && method !== "GET") {
      throw new HomeAssistantReadOnlyError(method, path);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  protected async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    skipRetry = false
  ): Promise<T> {
    this.assertMethodAllowed(method, path);
    const endpoint = `/api${path}`;
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    let lastError: Error | null = null;
    const maxAttempts = skipRetry ? 1 : this.retryConfig.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const bodyContent = body ? JSON.stringify(body) : null;
        const requestOptions: {
          method: HttpMethod;
          headers: Record<string, string>;
          body?: string;
          throwOnError: boolean;
          headersTimeout: number;
          bodyTimeout: number;
        } = {
          method,
          headers,
          throwOnError: false,
          headersTimeout: this.timeout,
          bodyTimeout: this.timeout,
        };
        if (bodyContent) {
          requestOptions.body = bodyContent;
        }

        const response = await request(url, requestOptions);
        const responseText = await response.body.text();

        if (response.statusCode >= 400) {
          const error = new HomeAssistantApiError(
            `API request failed: ${response.statusCode} - ${responseText}`,
            response.statusCode,
            responseText,
            endpoint
          );

          if (this.retryConfig.retryableStatusCodes.includes(response.statusCode) && attempt < maxAttempts - 1) {
            lastError = error;
            const delay = this.calculateDelay(attempt);
            await this.sleep(delay);
            continue;
          }

          throw error;
        }

        if (!responseText || responseText.trim() === "") {
          return undefined as T;
        }

        return JSON.parse(responseText) as T;
      } catch (error) {
        if (error instanceof HomeAssistantApiError) {
          throw error;
        }

        if (
          error instanceof Error &&
          (error.message.includes("ECONNREFUSED") ||
            error.message.includes("ENOTFOUND") ||
            error.message.includes("ETIMEDOUT") ||
            error.message.includes("fetch failed") ||
            error.message.includes("ECONNRESET"))
        ) {
          const connError = new HomeAssistantConnectionError(
            `Failed to connect to Home Assistant at ${this.baseUrl}. ` +
              `Please check the URL and ensure Home Assistant is running.`,
            endpoint
          );

          if (attempt < maxAttempts - 1) {
            lastError = connError;
            const delay = this.calculateDelay(attempt);
            await this.sleep(delay);
            continue;
          }

          throw connError;
        }

        if (error instanceof Error && error.message.includes("timeout")) {
          const timeoutError = new HomeAssistantTimeoutError(this.timeout, endpoint);
          
          if (attempt < maxAttempts - 1) {
            lastError = timeoutError;
            const delay = this.calculateDelay(attempt);
            await this.sleep(delay);
            continue;
          }

          throw timeoutError;
        }

        throw error;
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  protected async requestText(path: string, body?: unknown): Promise<string> {
    this.assertMethodAllowed(body ? "POST" : "GET", path);
    const endpoint = `/api${path}`;
    const url = `${this.baseUrl}${endpoint}`;
    const bodyContent = body ? JSON.stringify(body) : null;
    const requestOptions: {
      method: "GET" | "POST";
      headers: Record<string, string>;
      body?: string;
      headersTimeout: number;
      bodyTimeout: number;
    } = {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      headersTimeout: this.timeout,
      bodyTimeout: this.timeout,
    };
    if (bodyContent) {
      requestOptions.body = bodyContent;
    }

    const response = await request(url, requestOptions);

    return response.body.text() as Promise<string>;
  }

  protected async requestBuffer(path: string): Promise<Buffer> {
    this.assertMethodAllowed("GET", path);
    const endpoint = `/api${path}`;
    const url = `${this.baseUrl}${endpoint}`;
    const response = await request(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      headersTimeout: this.timeout,
      bodyTimeout: this.timeout,
    });

    const arrayBuffer = await response.body.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
