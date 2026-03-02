import type { Config } from "../types/options.js";
import { HomeAssistantClient } from "./client.js";

export interface HassioApiResponse<T = unknown> {
  result: "ok" | "error";
  data?: T;
  message?: string;
}

export class SupervisorApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async proxy<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, unknown>
  ): Promise<HassioApiResponse<T>> {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return this.request<HassioApiResponse<T>>(method, `/hassio${normalized}`, body);
  }

  async getAddons(): Promise<HassioApiResponse> {
    return this.proxy("GET", "/addons");
  }

  async getAddonInfo(slug: string): Promise<HassioApiResponse> {
    return this.proxy("GET", `/addons/${slug}/info`);
  }

  async addonStart(slug: string): Promise<HassioApiResponse> {
    return this.proxy("POST", `/addons/${slug}/start`);
  }

  async addonStop(slug: string): Promise<HassioApiResponse> {
    return this.proxy("POST", `/addons/${slug}/stop`);
  }

  async addonRestart(slug: string): Promise<HassioApiResponse> {
    return this.proxy("POST", `/addons/${slug}/restart`);
  }

  async hostReboot(): Promise<HassioApiResponse> {
    return this.proxy("POST", "/host/reboot");
  }

  async hostShutdown(): Promise<HassioApiResponse> {
    return this.proxy("POST", "/host/shutdown");
  }

  async getSupervisorLogs(): Promise<HassioApiResponse> {
    return this.proxy("GET", "/supervisor/logs");
  }
}
