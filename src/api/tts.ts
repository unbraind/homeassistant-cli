/**
 * Implements typed Home Assistant tts API transport operations.
 */
import type { Config } from "../types/options.js";
import { HomeAssistantClient } from "./client.js";

export interface HaTtsEngine {
  engine_id: string;
  name: string;
  supported_languages: string[] | null;
}

export class TtsApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getTtsEngines(): Promise<HaTtsEngine[]> {
    return this.request<HaTtsEngine[]>("GET", "/tts_engines");
  }

  async getTtsUrl(
    engineId: string,
    message: string,
    options?: {
      language?: string;
      options?: Record<string, unknown>;
    }
  ): Promise<string> {
    const body: Record<string, unknown> = { message };
    if (options?.language) body["language"] = options.language;
    if (options?.options) body["options"] = options.options;
    
    const result = await this.request<{ url: string; path: string }>(
      "POST",
      `/tts_get_url/${engineId}`,
      body
    );
    return result.url;
  }

  async speak(
    mediaPlayerEntityId: string,
    message: string,
    options?: {
      engineId?: string;
      language?: string;
      cache?: boolean;
    }
  ): Promise<void> {
    const data: Record<string, unknown> = {
      entity_id: mediaPlayerEntityId,
      message,
    };
    if (options?.cache !== undefined) data["cache"] = options.cache;
    
    await this.callService("tts", "speak", data);
  }

  async clearTtsCache(): Promise<void> {
    await this.callService("tts", "clear_cache");
  }
}
