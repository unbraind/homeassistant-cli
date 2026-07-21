/**
 * Implements typed Home Assistant base API transport operations.
 */
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

const CONNECTION_ERROR_PATTERNS = [
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "fetch failed",
  "ECONNRESET",
];

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

  private isConnectionError(error: Error): boolean {
    return CONNECTION_ERROR_PATTERNS.some(p => error.message.includes(p));
  }

  private isTimeoutError(error: Error): boolean {
    return error.message.includes("timeout");
  }

  private async executeWithRetry<T>(
    method: HttpMethod,
    path: string,
    headers: Record<string, string>,
    body: string | null,
    processResponse: (statusCode: number, response: { body: { text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> } }) => Promise<T>
  ): Promise<T> {
    const endpoint = `/api${path}`;
    const url = `${this.baseUrl}${endpoint}`;
    const maxAttempts = this.retryConfig.maxRetries + 1;

    for (let attempt = 0; ; attempt++) {
      try {
        const requestOptions: {
          method: HttpMethod;
          headers: Record<string, string>;
          body?: string;
          headersTimeout: number;
          bodyTimeout: number;
        } = {
          method,
          headers,
          headersTimeout: this.timeout,
          bodyTimeout: this.timeout,
        };
        if (body) {
          requestOptions.body = body;
        }

        const response = await request(url, requestOptions);

        if (response.statusCode >= 400) {
          const responseText = await response.body.text();
          const error = new HomeAssistantApiError(
            `API request failed: ${response.statusCode} - ${responseText}`,
            response.statusCode,
            responseText,
            endpoint
          );

          if (this.retryConfig.retryableStatusCodes.includes(response.statusCode) && attempt < maxAttempts - 1) {
            await this.sleep(this.calculateDelay(attempt));
            continue;
          }

          throw error;
        }

        return await processResponse(response.statusCode, response);
      } catch (error) {
        if (error instanceof HomeAssistantApiError) {
          throw error;
        }

        if (error instanceof Error && this.isConnectionError(error)) {
          const connError = new HomeAssistantConnectionError(
            `Failed to connect to Home Assistant at ${this.baseUrl}. ` +
              `Please check the URL and ensure Home Assistant is running.`,
            endpoint
          );

          if (attempt < maxAttempts - 1) {
            await this.sleep(this.calculateDelay(attempt));
            continue;
          }

          throw connError;
        }

        if (error instanceof Error && this.isTimeoutError(error)) {
          const timeoutError = new HomeAssistantTimeoutError(this.timeout, endpoint);

          if (attempt < maxAttempts - 1) {
            await this.sleep(this.calculateDelay(attempt));
            continue;
          }

          throw timeoutError;
        }

        throw error;
      }
    }
  }

  protected async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<T> {
    this.assertMethodAllowed(method, path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    const bodyContent = body ? JSON.stringify(body) : null;

    return this.executeWithRetry<T>(
      method, path, headers, bodyContent,
      async (_statusCode, response) => {
        const responseText = await response.body.text();
        if (!responseText || responseText.trim() === "") {
          return undefined as T;
        }
        return JSON.parse(responseText) as T;
      }
    );
  }

  protected async requestText(path: string, body?: unknown): Promise<string> {
    const method: HttpMethod = body ? "POST" : "GET";
    this.assertMethodAllowed(method, path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    const bodyContent = body ? JSON.stringify(body) : null;

    return this.executeWithRetry<string>(
      method, path, headers, bodyContent,
      async (_statusCode, response) => response.body.text()
    );
  }

  protected async requestBuffer(path: string): Promise<Buffer> {
    this.assertMethodAllowed("GET", path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };

    return this.executeWithRetry<Buffer>(
      "GET", path, headers, null,
      async (_statusCode, response) => {
        const arrayBuffer = await response.body.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    );
  }
}
