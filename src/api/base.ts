import { request } from "undici";
import { HomeAssistantApiError, HomeAssistantConnectionError, HomeAssistantReadOnlyError } from "./errors.js";
import type { Config } from "../types/options.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export abstract class BaseClient {
  protected readonly baseUrl: string;
  protected readonly token: string;
  protected readonly timeout: number;
  protected readonly readOnly: boolean;

  constructor(config: Config) {
    this.baseUrl = config.url;
    this.token = config.token;
    this.timeout = config.timeout;
    this.readOnly = config.readOnly;
  }

  private assertMethodAllowed(method: HttpMethod, path: string): void {
    if (this.readOnly && method !== "GET") {
      throw new HomeAssistantReadOnlyError(method, path);
    }
  }

  protected async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown
  ): Promise<T> {
    this.assertMethodAllowed(method, path);
    const url = `${this.baseUrl}/api${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

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
        throw new HomeAssistantApiError(
          `API request failed: ${response.statusCode} - ${responseText}`,
          response.statusCode,
          responseText
        );
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
          error.message.includes("fetch failed"))
      ) {
        throw new HomeAssistantConnectionError(
          `Failed to connect to Home Assistant at ${this.baseUrl}. ` +
            `Please check the URL and ensure Home Assistant is running.`
        );
      }

      throw error;
    }
  }

  protected async requestText(path: string, body?: unknown): Promise<string> {
    this.assertMethodAllowed(body ? "POST" : "GET", path);
    const url = `${this.baseUrl}/api${path}`;
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
    const url = `${this.baseUrl}/api${path}`;
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
