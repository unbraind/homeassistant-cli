import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createCallServiceCommand(): Command {
  const command = new Command("call-service")
    .description("Call a Home Assistant service")
    .argument("<domain>", "Service domain (e.g., light, switch)")
    .argument("<service>", "Service name (e.g., turn_on, toggle)")
    .option("-e, --entity-id <entity>", "Entity ID to target")
    .option("-d, --data <json>", "JSON data to pass to the service")
    .option("-r, --return-response", "Return response data from service", false);

  command.action(
    async (
      domain: string,
      service: string,
      options: { entityId?: string; data?: string; returnResponse?: boolean },
      cmd
    ) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      let data: Record<string, unknown> | undefined;
      if (options.data) {
        data = JSON.parse(options.data) as Record<string, unknown>;
      }

      if (options.entityId) {
        data = { ...data, entity_id: options.entityId };
      }

      const result = await client.callService(
        domain,
        service,
        data,
        options.returnResponse
      );
      console.log(formatOutput(result, format));
    }
  );

  return command;
}

export function createFireEventCommand(): Command {
  const command = new Command("fire-event")
    .description("Fire a Home Assistant event")
    .argument("<event-type>", "Event type to fire")
    .option("-d, --data <json>", "JSON event data");

  command.action(
    async (eventType: string, options: { data?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      let eventData: Record<string, unknown> | undefined;
      if (options.data) {
        eventData = JSON.parse(options.data) as Record<string, unknown>;
      }

      const result = await client.fireEvent(eventType, eventData);
      console.log(formatOutput(result, format));
    }
  );

  return command;
}

export function createRenderTemplateCommand(): Command {
  const command = new Command("render-template")
    .description("Render a Home Assistant template")
    .argument("<template>", "Template string to render")
    .option("--file <path>", "Read template from file");

  command.action(
    async (templateArg: string, options: { file?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);

      let template = templateArg;
      if (options.file) {
        const fs = await import("node:fs/promises");
        template = await fs.readFile(options.file, "utf-8");
      }

      const result = await client.renderTemplate(template);
      console.log(result);
    }
  );

  return command;
}

export function createCheckConfigCommand(): Command {
  return new Command("check-config")
    .description("Validate the Home Assistant configuration")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);
      const result = await client.checkConfig();
      console.log(formatOutput(result, format));
    });
}

export function createHandleIntentCommand(): Command {
  const command = new Command("handle-intent")
    .description("Handle a Home Assistant intent")
    .argument("<name>", "Intent name")
    .option("-d, --data <json>", "JSON intent data");

  command.action(async (name: string, options: { data?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    let data: Record<string, unknown> | undefined;
    if (options.data) {
      data = JSON.parse(options.data) as Record<string, unknown>;
    }

    const result = await client.handleIntent(name, data);
    console.log(formatOutput(result, format));
  });

  return command;
}
