import { Command } from "commander";
import { WebSocketRegistryClient, HomeAssistantClient, HomeAssistantApiError } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import type { OutputFormat, HaState } from "../types/index.js";

interface RegistryOptions {
  entities?: boolean;
  entity?: boolean;
  devices?: boolean;
  device?: boolean;
  areas?: boolean;
  area?: boolean;
  floors?: boolean;
  floor?: boolean;
  labels?: boolean;
  label?: boolean;
  categories?: boolean;
  category?: boolean;
  domain?: string;
  deviceId?: string;
  areaId?: string;
  count?: boolean;
}

export function createRegistriesCommand(): Command {
  const command = new Command("registries")
    .description("Query Home Assistant registries (entities, devices, areas, etc.) via WebSocket")
    .option("--entities", "List entity registry")
    .option("--entity", "Alias for --entities")
    .option("--devices", "List device registry")
    .option("--device", "Alias for --devices")
    .option("--areas", "List area registry")
    .option("--area", "Alias for --areas")
    .option("--floors", "List floor registry")
    .option("--floor", "Alias for --floors")
    .option("--labels", "List label registry")
    .option("--label", "Alias for --labels")
    .option("--categories", "List category registry")
    .option("--category", "Alias for --categories")
    .option("-d, --domain <domain>", "Filter by domain (for entities)")
    .option("--device-id <id>", "Filter by device ID (for entities)")
    .option("--area-id <id>", "Filter by area ID (for devices/entities)")
    .option("--count", "Only return count");

  command.action(withExit(async (options: RegistryOptions, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const wsClient = new WebSocketRegistryClient(config);

    const useEntities = options.entities || options.entity;
    const useDevices = options.devices || options.device;
    const useAreas = options.areas || options.area;
    const useFloors = options.floors || options.floor;
    const useLabels = options.labels || options.label;
    const useCategories = options.categories || options.category;
    const showAll = !useEntities && !useDevices && !useAreas && !useFloors && !useLabels && !useCategories;

    try {
      if (showAll || useEntities) {
        await outputEntityRegistry(wsClient, options, format);
      }
      if (showAll || useDevices) {
        await outputDeviceRegistry(wsClient, options, format);
      }
      if (showAll || useAreas) {
        await outputAreaRegistry(wsClient, config, options, format);
      }
      if (showAll || useFloors) {
        await outputFloorRegistry(wsClient, options, format);
      }
      if (showAll || useLabels) {
        await outputLabelRegistry(wsClient, options, format);
      }
      if (showAll || useCategories) {
        await outputCategoryRegistry(wsClient, options, format);
      }
    } finally {
      await wsClient.close();
    }
  }));

  return command;
}

async function outputEntityRegistry(
  wsClient: WebSocketRegistryClient,
  options: RegistryOptions,
  format: OutputFormat
): Promise<void> {
  try {
    let entities = await wsClient.getEntityRegistry();
    if (options.domain) {
      entities = entities.filter(e => e.entity_id.startsWith(`${options.domain}.`));
    }
    if (options.deviceId) {
      entities = entities.filter(e => e.device_id === options.deviceId);
    }
    if (options.areaId) {
      entities = entities.filter(e => e.area_id === options.areaId);
    }
    const key = options.count ? "entity_registry_count" : "entity_registry";
    const value = options.count ? entities.length : entities;
    console.log(formatOutput({ [key]: value }, format));
  } catch {
    console.log(formatOutput({
      entity_registry: [],
      message: "Entity registry unavailable. Use 'hassio entities' for state-based queries.",
    }, format));
  }
}

async function outputDeviceRegistry(
  wsClient: WebSocketRegistryClient,
  options: RegistryOptions,
  format: OutputFormat
): Promise<void> {
  try {
    let devices = await wsClient.getDeviceRegistry();
    if (options.areaId) {
      devices = devices.filter(d => d.area_id === options.areaId);
    }
    const key = options.count ? "device_registry_count" : "device_registry";
    const value = options.count ? devices.length : devices;
    console.log(formatOutput({ [key]: value }, format));
  } catch {
    console.log(formatOutput({ device_registry: [], message: "Device registry unavailable." }, format));
  }
}

async function outputAreaRegistry(
  wsClient: WebSocketRegistryClient,
  config: { url: string; token: string; outputFormat: OutputFormat; timeout: number; readOnly: boolean },
  options: RegistryOptions,
  format: OutputFormat
): Promise<void> {
  try {
    const areas = await wsClient.getAreaRegistry();
    const key = options.count ? "area_registry_count" : "area_registry";
    const value = options.count ? areas.length : areas;
    console.log(formatOutput({ [key]: value }, format));
  } catch {
    // Fall back to state-based area discovery
    try {
      const baseClient = new HomeAssistantClient(config);
      const states = await baseClient.getStates();
      const areaIds = [...new Set(
        states
          .filter((s: HaState) => s.attributes["area_id"])
          .map((s: HaState) => String(s.attributes["area_id"]))
      )];
      console.log(formatOutput({
        area_registry: areaIds.map(id => ({ area_id: id })),
        message: "Area registry from entity states (WebSocket unavailable)",
      }, format));
    } catch (e) {
      if (e instanceof HomeAssistantApiError) throw e;
      console.log(formatOutput({ area_registry: [], message: "Area registry unavailable." }, format));
    }
  }
}

async function outputFloorRegistry(
  wsClient: WebSocketRegistryClient,
  options: RegistryOptions,
  format: OutputFormat
): Promise<void> {
  try {
    const floors = await wsClient.getFloorRegistry();
    const key = options.count ? "floor_registry_count" : "floor_registry";
    const value = options.count ? floors.length : floors;
    console.log(formatOutput({ [key]: value }, format));
  } catch {
    console.log(formatOutput({ floor_registry: [], message: "Floor registry unavailable." }, format));
  }
}

async function outputLabelRegistry(
  wsClient: WebSocketRegistryClient,
  options: RegistryOptions,
  format: OutputFormat
): Promise<void> {
  try {
    const labels = await wsClient.getLabelRegistry();
    const key = options.count ? "label_registry_count" : "label_registry";
    const value = options.count ? labels.length : labels;
    console.log(formatOutput({ [key]: value }, format));
  } catch {
    console.log(formatOutput({ label_registry: [], message: "Label registry unavailable." }, format));
  }
}

async function outputCategoryRegistry(
  wsClient: WebSocketRegistryClient,
  options: RegistryOptions,
  format: OutputFormat
): Promise<void> {
  try {
    const categories = await wsClient.getCategoryRegistry();
    const key = options.count ? "category_registry_count" : "category_registry";
    const value = options.count ? categories.length : categories;
    console.log(formatOutput({ [key]: value }, format));
  } catch {
    console.log(formatOutput({ category_registry: [], message: "Category registry unavailable." }, format));
  }
}
