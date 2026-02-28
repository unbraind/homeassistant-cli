import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput, formatStates } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

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
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getStatus();
      console.log(formatOutput(result, format));
    });
}

export function createConfigCommand(): Command {
  return new Command("config")
    .description("Get the current Home Assistant configuration")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getConfig();
      console.log(formatOutput(result, format));
    });
}

export function createComponentsCommand(): Command {
  return new Command("components")
    .description("Get list of loaded components")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getComponents();
      console.log(formatOutput(result, format));
    });
}

export function createEventsCommand(): Command {
  return new Command("events")
    .description("Get list of available events")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getEvents();
      console.log(formatOutput(result, format));
    });
}

export function createServicesCommand(): Command {
  return new Command("services")
    .description("Get list of available services")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.getServices();
      console.log(formatOutput(result, format));
    });
}

export function createStatesCommand(): Command {
  const command = new Command("states")
    .description("Get entity states")
    .argument("[entity-id]", "Specific entity ID to get state for");

  command.action(async (entityId: string | undefined, _options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (entityId) {
      const result = await client.getState(entityId);
      console.log(formatOutput(result, format));
    } else {
      const result = await client.getStates();
      console.log(formatStates(result, format));
    }
  });

  return command;
}

export function createSetStateCommand(): Command {
  const command = new Command("set-state")
    .description("Set or update an entity state")
    .argument("<entity-id>", "Entity ID to update")
    .argument("<state>", "State value to set")
    .option("-a, --attributes <json>", "JSON attributes to set");

  command.action(
    async (entityId: string, state: string, options: { attributes?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      let attributes: Record<string, unknown> | undefined;
      if (options.attributes) {
        attributes = JSON.parse(options.attributes) as Record<string, unknown>;
      }

      const result = await client.setState(entityId, state, attributes);
      console.log(formatOutput(result, format));
    }
  );

  return command;
}

export function createDeleteStateCommand(): Command {
  const command = new Command("delete-state")
    .description("Delete an entity state")
    .argument("<entity-id>", "Entity ID to delete");

  command.action(async (entityId: string, _options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    await client.deleteState(entityId);
    console.log(formatOutput({ success: true, entity_id: entityId }, format));
  });

  return command;
}
