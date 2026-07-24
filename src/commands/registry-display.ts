/**
 * Renders Home Assistant's bandwidth-efficient entity registry display contract.
 */
import { formatOutput } from "../formatters/index.js";
import type {
  HaEntityRegistryDisplayEntry,
  HaEntityRegistryDisplayRow,
  OutputFormat,
} from "../types/index.js";
import { parseLimit } from "../utils/command-helpers.js";
import type { WebSocketRegistryClient } from "../api/registries.js";

export interface RegistryDisplayOptions {
  areaId?: string;
  count?: boolean;
  decodeDisplay?: boolean;
  deviceId?: string;
  domain?: string;
  limit?: string;
}

export async function outputEntityRegistryDisplay(
  client: WebSocketRegistryClient,
  options: RegistryDisplayOptions,
  format: OutputFormat,
): Promise<void> {
  const limit = options.limit === undefined ? undefined : parseLimit(options.limit);
  try {
    const response = await client.getEntityRegistryForDisplay();
    let entities = response.entities;
    if (options.domain) {
      entities = entities.filter((entry) => entry.ei.startsWith(`${options.domain}.`));
    }
    if (options.deviceId) {
      entities = entities.filter((entry) => entry.di === options.deviceId);
    }
    if (options.areaId) {
      entities = entities.filter((entry) => entry.ai === options.areaId);
    }
    if (limit !== undefined) {
      entities = entities.slice(0, limit);
    }

    if (options.count) {
      console.log(formatOutput({ entity_registry_display_count: entities.length }, format));
      return;
    }

    if (!options.decodeDisplay) {
      console.log(formatOutput({
        entity_categories: response.entity_categories,
        entity_registry_display: entities,
      }, format));
      return;
    }

    const decoded: HaEntityRegistryDisplayRow[] = entities.map(
      (entry: HaEntityRegistryDisplayEntry) => ({
        entity_id: entry.ei,
        platform: entry.pl,
        ...(entry.ai !== undefined ? { area_id: entry.ai } : {}),
        ...(entry.di !== undefined ? { device_id: entry.di } : {}),
        ...(entry.dp !== undefined ? { display_precision: entry.dp } : {}),
        ...(entry.ec !== undefined
          ? { entity_category: response.entity_categories[String(entry.ec)] }
          : {}),
        ...(entry.en !== undefined ? { name: entry.en } : {}),
        ...(entry.hb !== undefined ? { hidden: entry.hb } : {}),
        ...(entry.hn !== undefined ? { has_entity_name: entry.hn } : {}),
        ...(entry.ic !== undefined ? { icon: entry.ic } : {}),
        ...(entry.lb !== undefined ? { labels: entry.lb } : {}),
        ...(entry.tk !== undefined ? { translation_key: entry.tk } : {}),
      }),
    );
    console.log(formatOutput({ entity_registry_display: decoded }, format));
  } catch {
    console.log(formatOutput({
      entity_registry_display: [],
      message: "Compact entity registry display is unavailable.",
    }, format));
  }
}
