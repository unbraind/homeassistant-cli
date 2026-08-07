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
  HaAutomaticEntityIds,
  HaCompositeDeviceSplits,
  HaEntityNamePart,
  HaEntityRegistrySettings,
  HaEntityRegistryDisplayResponse,
  HaLinkedDevicesResponse,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";
import { HomeAssistantReadOnlyError } from "./errors.js";
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
  private readonly readOnly: boolean;
  private readonly wsClient: HomeAssistantWebSocketClient;

  constructor(config: Config) {
    this.readOnly = config.readOnly;
    this.wsClient = new HomeAssistantWebSocketClient(config);
  }

  async getEntityRegistry(): Promise<HaEntityRegistryEntry[]> {
    return this.wsClient.call("config/entity_registry/list") as Promise<HaEntityRegistryEntry[]>;
  }

  async getEntityRegistryForDisplay(): Promise<HaEntityRegistryDisplayResponse> {
    return this.wsClient.call(
      "config/entity_registry/list_for_display",
    ) as Promise<HaEntityRegistryDisplayResponse>;
  }

  async getDeviceRegistry(): Promise<HaDeviceRegistryEntry[]> {
    return this.wsClient.call("config/device_registry/list") as Promise<HaDeviceRegistryEntry[]>;
  }

  async getCompositeDeviceSplits(): Promise<HaCompositeDeviceSplits> {
    return this.wsClient.call(
      "config/device_registry/list_composite_splits",
    ) as Promise<HaCompositeDeviceSplits>;
  }

  async getLinkedDevices(deviceId: string): Promise<HaLinkedDevicesResponse> {
    return this.wsClient.call(
      "config/device_registry/list_linked_devices",
      { device_id: deviceId },
    ) as Promise<HaLinkedDevicesResponse>;
  }

  async getAutomaticEntityIds(entityIds: string[]): Promise<HaAutomaticEntityIds> {
    return this.wsClient.call(
      "config/entity_registry/get_automatic_entity_ids",
      { entity_ids: entityIds },
    ) as Promise<HaAutomaticEntityIds>;
  }

  async getEntityIdSettings(): Promise<HaEntityRegistrySettings> {
    return this.wsClient.call(
      "config/entity_registry/settings/get",
    ) as Promise<HaEntityRegistrySettings>;
  }

  async updateEntityIdSettings(entityIdParts: HaEntityNamePart[] | null): Promise<HaEntityRegistrySettings> {
    if (this.readOnly) {
      throw new HomeAssistantReadOnlyError(
        "WEBSOCKET",
        "/websocket/config/entity_registry/settings/update",
      );
    }
    return this.wsClient.call(
      "config/entity_registry/settings/update",
      { entity_id_parts: entityIdParts },
    ) as Promise<HaEntityRegistrySettings>;
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
