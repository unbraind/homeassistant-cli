/**
 * Implements typed Home Assistant registries API transport operations.
 */
import type { Config } from "../types/options.js";
import type {
  HaEntityRegistryEntry,
  HaDeviceRegistryEntry,
  HaAreaRegistryEntry,
  HaFloorRegistryEntry,
  HaLabelRegistryEntry,
  HaCategoryRegistryEntry,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";
import { HomeAssistantWebSocketClient } from "./websocket.js";

export class RegistryApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getEntityRegistry(): Promise<HaEntityRegistryEntry[]> {
    return this.request<HaEntityRegistryEntry[]>("GET", "/config/entity_registry/list");
  }

  async getDeviceRegistry(): Promise<HaDeviceRegistryEntry[]> {
    return this.request<HaDeviceRegistryEntry[]>("GET", "/config/device_registry/list");
  }

  async getAreaRegistry(): Promise<HaAreaRegistryEntry[]> {
    return this.request<HaAreaRegistryEntry[]>("GET", "/config/area_registry/list");
  }

  async getFloorRegistry(): Promise<HaFloorRegistryEntry[]> {
    return this.request<HaFloorRegistryEntry[]>("GET", "/config/floor_registry/list");
  }

  async getLabelRegistry(): Promise<HaLabelRegistryEntry[]> {
    return this.request<HaLabelRegistryEntry[]>("GET", "/config/label_registry/list");
  }

  async getCategoryRegistry(): Promise<HaCategoryRegistryEntry[]> {
    return this.request<HaCategoryRegistryEntry[]>("GET", "/config/category_registry/list");
  }
}

/**
 * WebSocket-based registry client for HA 2024+ where registry endpoints
 * are only accessible via WebSocket (not REST API).
 */
export class WebSocketRegistryClient {
  private readonly wsClient: HomeAssistantWebSocketClient;

  constructor(config: Config) {
    this.wsClient = new HomeAssistantWebSocketClient(config);
  }

  async getEntityRegistry(): Promise<HaEntityRegistryEntry[]> {
    return this.wsClient.call("config/entity_registry/list") as Promise<HaEntityRegistryEntry[]>;
  }

  async getDeviceRegistry(): Promise<HaDeviceRegistryEntry[]> {
    return this.wsClient.call("config/device_registry/list") as Promise<HaDeviceRegistryEntry[]>;
  }

  async getAreaRegistry(): Promise<HaAreaRegistryEntry[]> {
    return this.wsClient.call("config/area_registry/list") as Promise<HaAreaRegistryEntry[]>;
  }

  async getFloorRegistry(): Promise<HaFloorRegistryEntry[]> {
    return this.wsClient.call("config/floor_registry/list") as Promise<HaFloorRegistryEntry[]>;
  }

  async getLabelRegistry(): Promise<HaLabelRegistryEntry[]> {
    return this.wsClient.call("config/label_registry/list") as Promise<HaLabelRegistryEntry[]>;
  }

  async getCategoryRegistry(): Promise<HaCategoryRegistryEntry[]> {
    return this.wsClient.call("config/category_registry/list") as Promise<HaCategoryRegistryEntry[]>;
  }

  async close(): Promise<void> {
    await this.wsClient.close();
  }
}
