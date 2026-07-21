/**
 * Implements typed Home Assistant search API transport operations.
 */
import type { Config } from "../types/options.js";
import type { HaState } from "../types/api.js";
import { HomeAssistantClient } from "./client.js";
import { HomeAssistantApiError } from "./errors.js";

export interface HaSearchResult {
  entity_id: string;
  name: string;
  domain: string;
  area: string | null;
  labels: string[];
  device: string | null;
  platform: string;
  state: string;
}

export interface HaSearchResponse {
  results: HaSearchResult[];
}

export class SearchApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async search(query: string): Promise<HaSearchResult[]> {
    const params = new URLSearchParams();
    params.set("q", query);

    try {
      return await this.request<HaSearchResult[]>("GET", `/search?${params.toString()}`);
    } catch (error) {
      // /api/search is not available on some Home Assistant setups; use local state search fallback.
      if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
        const fallbackStates = await this.quickSearch(query);
        return fallbackStates.map((state) => {
          const domain = state.entity_id.split(".")[0] || "unknown";
          return {
            entity_id: state.entity_id,
            name: (state.attributes["friendly_name"] as string) || state.entity_id,
            domain,
            area: (state.attributes["area_id"] as string) || null,
            labels: [],
            device: (state.attributes["device_class"] as string) || null,
            platform: "state_fallback",
            state: state.state,
          };
        });
      }
      throw error;
    }
  }

  async searchByDomain(query: string, domain: string): Promise<HaSearchResult[]> {
    const results = await this.search(query);
    return results.filter(r => r.domain === domain);
  }

  async fuzzySearch(
    query: string,
    options?: {
      domain?: string;
      area?: string;
      state?: string;
    }
  ): Promise<HaSearchResult[]> {
    let results = await this.search(query);
    
    if (options?.domain) {
      results = results.filter(r => r.domain === options.domain);
    }
    if (options?.area) {
      results = results.filter(r => r.area === options.area);
    }
    if (options?.state) {
      results = results.filter(r => r.state === options.state);
    }
    
    return results;
  }

  async quickSearch(pattern: string): Promise<HaState[]> {
    const states = await this.getStates();
    const lowerPattern = pattern.toLowerCase();
    
    return states.filter(s => 
      s.entity_id.toLowerCase().includes(lowerPattern) ||
      (s.attributes["friendly_name"] as string)?.toLowerCase().includes(lowerPattern)
    );
  }
}
