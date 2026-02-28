import { request } from "undici";
import type { Config } from "../types/options.js";
import type {
  HaPerson,
  HaZone,
  HaAnalytics,
  HaBackup,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";

export class SystemApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getPersons(): Promise<HaPerson[]> {
    return this.request<HaPerson[]>("GET", "/person");
  }

  async getZones(): Promise<HaZone[]> {
    return this.request<HaZone[]>("GET", "/zones");
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
}
