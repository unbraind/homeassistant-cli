import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { RegistryApiClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new RegistryApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createRegistriesCommand(): Command {
  const command = new Command("registries")
    .description("Query Home Assistant registries (entities, devices, areas, etc.)")
    .option("--entities", "List entity registry")
    .option("--devices", "List device registry")
    .option("--areas", "List area registry")
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
    const format = getFormat(globalOpts);

    // Default to entities if no option specified
    const showAll = !options.entities && !options.devices && !options.areas && 
                    !options.floors && !options.labels && !options.categories;

    if (showAll || options.entities) {
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
    }

    if (showAll || options.devices) {
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
    }

    if (showAll || options.areas) {
      const areas = await client.getAreaRegistry();
      if (options.count) {
        console.log(formatOutput({ area_registry_count: areas.length }, format));
      } else {
        console.log(formatOutput({ area_registry: areas }, format));
      }
    }

    if (showAll || options.floors) {
      const floors = await client.getFloorRegistry();
      if (options.count) {
        console.log(formatOutput({ floor_registry_count: floors.length }, format));
      } else {
        console.log(formatOutput({ floor_registry: floors }, format));
      }
    }

    if (showAll || options.labels) {
      const labels = await client.getLabelRegistry();
      if (options.count) {
        console.log(formatOutput({ label_registry_count: labels.length }, format));
      } else {
        console.log(formatOutput({ label_registry: labels }, format));
      }
    }

    if (showAll || options.categories) {
      const categories = await client.getCategoryRegistry();
      if (options.count) {
        console.log(formatOutput({ category_registry_count: categories.length }, format));
      } else {
        console.log(formatOutput({ category_registry: categories }, format));
      }
    }
  });

  return command;
}
