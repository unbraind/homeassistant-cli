/**
 * Implements typed Home Assistant system API transport operations.
 */
import { FormData, request } from "undici";
import type { Config } from "../types/options.js";
import type {
  HaPerson,
  HaZone,
  HaAnalytics,
  HaBackup,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";

export interface CreatePersonData {
  name: string;
  user_id?: string;
  device_trackers?: string[];
}

export interface UpdatePersonData {
  name?: string;
  user_id?: string;
  device_trackers?: string[];
}

export interface CreateZoneData {
  name: string;
  icon?: string;
  latitude: number;
  longitude: number;
  radius: number;
  passive?: boolean;
}

export interface UpdateZoneData {
  name?: string;
  icon?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  passive?: boolean;
}

export class SystemApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getPersons(): Promise<HaPerson[]> {
    return this.request<HaPerson[]>("GET", "/person");
  }

  async getPerson(personId: string): Promise<HaPerson> {
    return this.request<HaPerson>("GET", `/person/${personId}`);
  }

  async createPerson(data: CreatePersonData): Promise<HaPerson> {
    return this.request<HaPerson>("POST", "/person/create", data);
  }

  async updatePerson(personId: string, data: UpdatePersonData): Promise<HaPerson> {
    return this.request<HaPerson>("POST", `/person/${personId}/update`, data);
  }

  async deletePerson(personId: string): Promise<void> {
    await this.request<void>("DELETE", `/person/${personId}`);
  }

  async getZones(): Promise<HaZone[]> {
    return this.request<HaZone[]>("GET", "/zones");
  }

  async getZone(zoneId: string): Promise<HaZone> {
    return this.request<HaZone>("GET", `/zones/${zoneId}`);
  }

  async createZone(data: CreateZoneData): Promise<HaZone> {
    return this.request<HaZone>("POST", "/zones/create", data);
  }

  async updateZone(zoneId: string, data: UpdateZoneData): Promise<HaZone> {
    return this.request<HaZone>("POST", `/zones/${zoneId}/update`, data);
  }

  async deleteZone(zoneId: string): Promise<void> {
    await this.request<void>("DELETE", `/zones/${zoneId}`);
  }

  async getAnalytics(): Promise<HaAnalytics> {
    return this.request<HaAnalytics>("GET", "/analytics");
  }

  async getBackups(): Promise<HaBackup[]> {
    return this.request<HaBackup[]>("GET", "/backups");
  }

  async createBackup(name: string, options?: { compressed?: boolean; password?: string }): Promise<HaBackup> {
    return this.request<HaBackup>("POST", "/backups", {
      name,
      compressed: options?.compressed ?? true,
      password: options?.password,
    });
  }

  async restoreBackup(backupId: string, options?: { password?: string }): Promise<void> {
    await this.request<void>("POST", `/backups/${backupId}/restore`, {
      password: options?.password,
    });
  }

  async deleteBackup(backupId: string): Promise<void> {
    await this.request<void>("DELETE", `/backups/${backupId}`);
  }

  async downloadBackup(backupId: string): Promise<Buffer> {
    const url = `${this.baseUrl}/api/backups/${backupId}/download`;
    const response = await request(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    const arrayBuffer = await response.body.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async uploadBackup(file: Buffer, filename: string): Promise<HaBackup> {
    const url = `${this.baseUrl}/api/backups/upload`;
    const formData = new FormData();
    const blob = new Blob([file]);
    formData.append('file', blob, filename);

    const response = await request(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    const text = await response.body.text();
    return JSON.parse(text);
  }
}
