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
