import type { Config } from "../types/options.js";
import type {
  HaAreaRegistryEntry,
  HaFloorRegistryEntry,
  HaLabelRegistryEntry,
  HaEntityRegistryEntry,
  HaDeviceRegistryEntry,
} from "../types/api.js";
import { HomeAssistantWebSocketClient } from "./websocket.js";

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

export class RegistryCrudClient {
  private readonly ws: HomeAssistantWebSocketClient;

  constructor(config: Config) {
    this.ws = new HomeAssistantWebSocketClient(config);
  }

  private async wsCall<T>(type: string, params: Record<string, unknown>): Promise<T> {
    try {
      const result = await this.ws.call(type, params);
      return result as T;
    } finally {
      await this.ws.close();
    }
  }

  async createArea(params: CreateAreaParams): Promise<HaAreaRegistryEntry> {
    return this.wsCall<HaAreaRegistryEntry>("config/area_registry/create", params as unknown as Record<string, unknown>);
  }

  async updateArea(params: UpdateAreaParams): Promise<HaAreaRegistryEntry> {
    return this.wsCall<HaAreaRegistryEntry>("config/area_registry/update", params as unknown as Record<string, unknown>);
  }

  async deleteArea(areaId: string): Promise<void> {
    await this.wsCall<void>("config/area_registry/delete", { area_id: areaId } as Record<string, unknown>);
  }

  async createFloor(params: CreateFloorParams): Promise<HaFloorRegistryEntry> {
    return this.wsCall<HaFloorRegistryEntry>("config/floor_registry/create", params as unknown as Record<string, unknown>);
  }

  async updateFloor(params: UpdateFloorParams): Promise<HaFloorRegistryEntry> {
    return this.wsCall<HaFloorRegistryEntry>("config/floor_registry/update", params as unknown as Record<string, unknown>);
  }

  async deleteFloor(floorId: string): Promise<void> {
    await this.wsCall<void>("config/floor_registry/delete", { floor_id: floorId } as Record<string, unknown>);
  }

  async createLabel(params: CreateLabelParams): Promise<HaLabelRegistryEntry> {
    return this.wsCall<HaLabelRegistryEntry>("config/label_registry/create", params as unknown as Record<string, unknown>);
  }

  async updateLabel(params: UpdateLabelParams): Promise<HaLabelRegistryEntry> {
    return this.wsCall<HaLabelRegistryEntry>("config/label_registry/update", params as unknown as Record<string, unknown>);
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.wsCall<void>("config/label_registry/delete", { label_id: labelId } as Record<string, unknown>);
  }

  async updateEntity(params: UpdateEntityParams): Promise<HaEntityRegistryEntry> {
    return this.wsCall<HaEntityRegistryEntry>("config/entity_registry/update", params as unknown as Record<string, unknown>);
  }

  async updateDevice(params: UpdateDeviceParams): Promise<HaDeviceRegistryEntry> {
    return this.wsCall<HaDeviceRegistryEntry>("config/device_registry/update", params as unknown as Record<string, unknown>);
  }
}
