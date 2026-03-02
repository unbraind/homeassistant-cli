import type { Config } from "../types/options.js";
import type { HaConfigEntry } from "../types/api.js";
import { HomeAssistantClient } from "./client.js";

export class ConfigEntriesApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getConfigEntries(): Promise<HaConfigEntry[]> {
    return this.request<HaConfigEntry[]>("GET", "/config/config_entries/entry");
  }

  async deleteConfigEntry(entryId: string): Promise<void> {
    await this.request<void>("DELETE", `/config/config_entries/entry/${entryId}`);
  }
}
