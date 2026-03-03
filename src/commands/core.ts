import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput, formatServices, formatStates } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";
import { withExit } from "../utils/exit.js";
import { flattenServices, getServiceNames, normalizeServices } from "../utils/services.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createStatusCommand(): Command {
  return new Command("status")
    .description("Check if the Home Assistant API is running")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getStatus();
      console.log(formatOutput(result, format));
    }));
}

export function createConfigCommand(): Command {
  return new Command("config")
    .description("Get the current Home Assistant configuration")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getConfig();
      console.log(formatOutput(result, format));
    }));
}

export function createComponentsCommand(): Command {
  return new Command("components")
    .description("Get list of loaded components")
    .option("--count", "Only return count")
    .action(withExit(async (options: { count?: boolean }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getComponents();
      if (options.count) {
        console.log(formatOutput({ components_count: result.length }, format));
        return;
      }
      console.log(formatOutput(result, format));
    }));
}

export function createEventsCommand(): Command {
  return new Command("events")
    .description("Get list of available events")
    .option("--count", "Only return count")
    .action(withExit(async (options: { count?: boolean }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getEvents();
      if (options.count) {
        console.log(formatOutput({ events_count: result.length }, format));
        return;
      }
      console.log(formatOutput(result, format));
    }));
}

export function createServicesCommand(): Command {
  return new Command("services")
    .description("Get list of available services")
    .option("-d, --domain <domain>", "Filter by service domain (e.g., light)")
    .option("-s, --service <name>", "Filter by service name (e.g., turn_on)")
    .option("--count", "Return summary counts only")
    .option("--flat", "Flatten to one row per domain/service (LLM-friendly)")
    .option("--schema", "Return normalized service schema rows (LLM-friendly)")
    .action(withExit(async (options: {
      domain?: string;
      service?: string;
      count?: boolean;
      flat?: boolean;
      schema?: boolean;
    }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const services = await client.getServices();

      const filtered = services.filter((serviceDomain) => {
        if (options.domain && serviceDomain.domain !== options.domain) {
          return false;
        }
        if (options.service) {
          return getServiceNames(serviceDomain.services).includes(options.service);
        }
        return true;
      });

      if (options.count) {
        const byDomain = filtered
          .map((serviceDomain) => ({
            domain: serviceDomain.domain,
            service_count: getServiceNames(serviceDomain.services).length,
          }))
          .sort((a, b) => b.service_count - a.service_count);
        const totalServices = byDomain.reduce((acc, row) => acc + row.service_count, 0);
        console.log(formatOutput({
          domains: byDomain.length,
          total_services: totalServices,
          by_domain: byDomain,
        }, format));
        return;
      }

      if (options.flat) {
        console.log(formatOutput(flattenServices(filtered), format));
        return;
      }

      if (options.schema) {
        console.log(formatOutput(normalizeServices(filtered), format));
        return;
      }

      console.log(formatServices(filtered, format));
    }));
}

export function createStatesCommand(): Command {
  const command = new Command("states")
    .description("Get entity states")
    .option("--count", "Only return count")
    .argument("[entity-id]", "Specific entity ID to get state for");

  command.action(withExit(async (entityId: string | undefined, options: { count?: boolean }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (entityId) {
      const result = await client.getState(entityId);
      if (options.count) {
        console.log(formatOutput({ states_count: result ? 1 : 0 }, format));
        return;
      }
      console.log(formatOutput(result, format));
    } else {
      const result = await client.getStates();
      if (options.count) {
        console.log(formatOutput({ states_count: result.length }, format));
        return;
      }
      console.log(formatStates(result, format));
    }
  }));

  return command;
}

export function createSetStateCommand(): Command {
  const command = new Command("set-state")
    .description("Set or update an entity state")
    .argument("<entity-id>", "Entity ID to update")
    .argument("<state>", "State value to set")
    .option("-a, --attributes <json>", "JSON attributes to set");

  command.action(
    withExit(async (entityId: string, state: string, options: { attributes?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      let attributes: Record<string, unknown> | undefined;
      if (options.attributes) {
        attributes = JSON.parse(options.attributes) as Record<string, unknown>;
      }

      const result = await client.setState(entityId, state, attributes);
      console.log(formatOutput(result, format));
    })
  );

  return command;
}

export function createDeleteStateCommand(): Command {
  const command = new Command("delete-state")
    .description("Delete an entity state")
    .argument("<entity-id>", "Entity ID to delete");

  command.action(withExit(async (entityId: string, _options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    await client.deleteState(entityId);
    console.log(formatOutput({ success: true, entity_id: entityId }, format));
  }));

  return command;
}
