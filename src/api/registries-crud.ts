import type { Config } from "../types/options.js";
import type {
  HaAreaRegistryEntry,
  HaFloorRegistryEntry,
  HaLabelRegistryEntry,
  HaEntityRegistryEntry,
  HaDeviceRegistryEntry,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";

export interface CreateAreaParams {
  name: string;
  icon?: string;
  floor_id?: string;
  labels?: string[];
}

export interface UpdateAreaParams {
  area_id: string;
  name?: string;
  icon?: string;
  floor_id?: string | null;
  labels?: string[];
  aliases?: string[];
}

export interface CreateFloorParams {
  name: string;
  icon?: string;
  level?: number;
}

export interface UpdateFloorParams {
  floor_id: string;
  name?: string;
  icon?: string;
  level?: number | null;
  aliases?: string[];
}

export interface CreateLabelParams {
  name: string;
  icon?: string;
  color?: string;
  description?: string;
}

export interface UpdateLabelParams {
  label_id: string;
  name?: string;
  icon?: string;
  color?: string | null;
  description?: string | null;
}

export interface UpdateEntityParams {
  entity_id: string;
  name?: string | null;
  icon?: string | null;
  area_id?: string | null;
  labels?: string[];
  disabled_by?: string | null;
  hidden_by?: string | null;
}

export interface UpdateDeviceParams {
  device_id: string;
  area_id?: string | null;
  name?: string | null;
  labels?: string[];
}

export class RegistryCrudClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async createArea(params: CreateAreaParams): Promise<HaAreaRegistryEntry> {
    return this.request<HaAreaRegistryEntry>("POST", "/config/area_registry/create", params);
  }

  async updateArea(params: UpdateAreaParams): Promise<HaAreaRegistryEntry> {
    return this.request<HaAreaRegistryEntry>("POST", "/config/area_registry/update", params);
  }

  async deleteArea(areaId: string): Promise<void> {
    await this.request("POST", "/config/area_registry/delete", { area_id: areaId });
  }

  async createFloor(params: CreateFloorParams): Promise<HaFloorRegistryEntry> {
    return this.request<HaFloorRegistryEntry>("POST", "/config/floor_registry/create", params);
  }

  async updateFloor(params: UpdateFloorParams): Promise<HaFloorRegistryEntry> {
    return this.request<HaFloorRegistryEntry>("POST", "/config/floor_registry/update", params);
  }

  async deleteFloor(floorId: string): Promise<void> {
    await this.request("POST", "/config/floor_registry/delete", { floor_id: floorId });
  }

  async createLabel(params: CreateLabelParams): Promise<HaLabelRegistryEntry> {
    return this.request<HaLabelRegistryEntry>("POST", "/config/label_registry/create", params);
  }

  async updateLabel(params: UpdateLabelParams): Promise<HaLabelRegistryEntry> {
    return this.request<HaLabelRegistryEntry>("POST", "/config/label_registry/update", params);
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.request("POST", "/config/label_registry/delete", { label_id: labelId });
  }

  async updateEntity(params: UpdateEntityParams): Promise<HaEntityRegistryEntry> {
    return this.request<HaEntityRegistryEntry>("POST", "/config/entity_registry/update", params);
  }

  async updateDevice(params: UpdateDeviceParams): Promise<HaDeviceRegistryEntry> {
    return this.request<HaDeviceRegistryEntry>("POST", "/config/device_registry/update", params);
  }
}
