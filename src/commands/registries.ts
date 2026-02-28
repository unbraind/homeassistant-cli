import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { RegistryApiClient, HomeAssistantClient, HomeAssistantApiError } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat, HaState } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new RegistryApiClient(config);
}

function getBaseClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

function isRegistryUnavailable(error: unknown): boolean {
  if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
    return true;
  }
  return false;
}

export function createRegistriesCommand(): Command {
  const command = new Command("registries")
    .description("Query Home Assistant registries (entities, devices, areas, etc.)")
    .option("--entities", "List entity registry")
    .option("--devices", "List device registry")
    .option("--areas", "List area registry (from states if registry unavailable)")
    .option("--floors", "List floor registry")
    .option("--labels", "List label registry")
    .option("--categories", "List category registry")
    .option("-d, --domain <domain>", "Filter by domain (for entities)")
    .option("--device-id <id>", "Filter by device ID (for entities)")
    .option("--area-id <id>", "Filter by area ID (for devices/entities)")
    .option("--count", "Only return count");

  command.action(async (options: {
    entities?: boolean;
    devices?: boolean;
    areas?: boolean;
    floors?: boolean;
    labels?: boolean;
    categories?: boolean;
    domain?: string;
    deviceId?: string;
    areaId?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const baseClient = getBaseClient(globalOpts);
    const format = getFormat(globalOpts);

    const showAll = !options.entities && !options.devices && !options.areas && 
                    !options.floors && !options.labels && !options.categories;

    if (showAll || options.entities) {
      try {
        const entities = await client.getEntityRegistry();
        let filtered = entities;
        
        if (options.domain) {
          filtered = filtered.filter(e => e.entity_id.startsWith(`${options.domain}.`));
        }
        if (options.deviceId) {
          filtered = filtered.filter(e => e.device_id === options.deviceId);
        }
        if (options.areaId) {
          filtered = filtered.filter(e => e.area_id === options.areaId);
        }

        if (options.count) {
          console.log(formatOutput({ entity_registry_count: filtered.length }, format));
        } else {
          console.log(formatOutput({ entity_registry: filtered }, format));
        }
      } catch (error) {
        if (isRegistryUnavailable(error)) {
          console.log(formatOutput({ 
            entity_registry: [], 
            message: "Entity registry not available via REST API. Use 'hassio entities' to query entity states." 
          }, format));
        } else {
          throw error;
        }
      }
    }

    if (showAll || options.devices) {
      try {
        const devices = await client.getDeviceRegistry();
        let filtered = devices;
        
        if (options.areaId) {
          filtered = filtered.filter(d => d.area_id === options.areaId);
        }

        if (options.count) {
          console.log(formatOutput({ device_registry_count: filtered.length }, format));
        } else {
          console.log(formatOutput({ device_registry: filtered }, format));
        }
      } catch (error) {
        if (isRegistryUnavailable(error)) {
          console.log(formatOutput({ 
            device_registry: [], 
            message: "Device registry not available via REST API." 
          }, format));
        } else {
          throw error;
        }
      }
    }

    if (showAll || options.areas) {
      try {
        const areas = await client.getAreaRegistry();
        if (options.count) {
          console.log(formatOutput({ area_registry_count: areas.length }, format));
        } else {
          console.log(formatOutput({ area_registry: areas }, format));
        }
      } catch (error) {
        if (isRegistryUnavailable(error)) {
          const states = await baseClient.getStates();
          const areasFromStates = [...new Set(
            states
              .filter((s: HaState) => s.attributes.area_id)
              .map((s: HaState) => s.attributes.area_id)
          )];
          console.log(formatOutput({ 
            area_registry: areasFromStates.map(id => ({ area_id: id })),
            message: "Area registry from entity states (registry endpoint unavailable)" 
          }, format));
        } else {
          throw error;
        }
      }
    }

    if (showAll || options.floors) {
      try {
        const floors = await client.getFloorRegistry();
        if (options.count) {
          console.log(formatOutput({ floor_registry_count: floors.length }, format));
        } else {
          console.log(formatOutput({ floor_registry: floors }, format));
        }
      } catch (error) {
        if (isRegistryUnavailable(error)) {
          console.log(formatOutput({ 
            floor_registry: [], 
            message: "Floor registry not available via REST API." 
          }, format));
        } else {
          throw error;
        }
      }
    }

    if (showAll || options.labels) {
      try {
        const labels = await client.getLabelRegistry();
        if (options.count) {
          console.log(formatOutput({ label_registry_count: labels.length }, format));
        } else {
          console.log(formatOutput({ label_registry: labels }, format));
        }
      } catch (error) {
        if (isRegistryUnavailable(error)) {
          console.log(formatOutput({ 
            label_registry: [], 
            message: "Label registry not available via REST API." 
          }, format));
        } else {
          throw error;
        }
      }
    }

    if (showAll || options.categories) {
      try {
        const categories = await client.getCategoryRegistry();
        if (options.count) {
          console.log(formatOutput({ category_registry_count: categories.length }, format));
        } else {
          console.log(formatOutput({ category_registry: categories }, format));
        }
      } catch (error) {
        if (isRegistryUnavailable(error)) {
          console.log(formatOutput({ 
            category_registry: [], 
            message: "Category registry not available via REST API." 
          }, format));
        } else {
          throw error;
        }
      }
    }
  });

  return command;
}
