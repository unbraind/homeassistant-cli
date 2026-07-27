/**
 * Defines the services command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export { createCallServiceCommand } from "./service-action.js";

export function createFireEventCommand(): Command {
  const command = new Command("fire-event")
    .description("Fire a Home Assistant event")
    .argument("<event-type>", "Event type to fire")
    .option("-d, --data <json>", "JSON event data");

  command.action(
    withExit(async (eventType: string, options: { data?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      let eventData: Record<string, unknown> | undefined;
      if (options.data) {
        eventData = JSON.parse(options.data) as Record<string, unknown>;
      }

      const result = await client.fireEvent(eventType, eventData);
      console.log(formatOutput(result, format));
    })
  );

  return command;
}

export function createRenderTemplateCommand(): Command {
  const command = new Command("render-template")
    .description("Render a Home Assistant template")
    .argument("<template>", "Template string to render")
    .option("--file <path>", "Read template from file");

  command.action(
    withExit(async (templateArg: string, options: { file?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      let template = templateArg;
      if (options.file) {
        template = await readFile(options.file, "utf-8");
      }

      const result = await client.renderTemplate(template);
      console.log(formatOutput({ result }, format));
    })
  );

  return command;
}

export function createCheckConfigCommand(): Command {
  return new Command("check-config")
    .description("Validate the Home Assistant configuration")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);
      const result = await client.checkConfig();
      console.log(formatOutput(result, format));
    }));
}

export function createHandleIntentCommand(): Command {
  const command = new Command("handle-intent")
    .description("Handle a Home Assistant intent")
    .argument("<name>", "Intent name")
    .option("-d, --data <json>", "JSON intent data");

  command.action(withExit(async (name: string, options: { data?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    let data: Record<string, unknown> | undefined;
    if (options.data) {
      data = JSON.parse(options.data) as Record<string, unknown>;
    }

    const result = await client.handleIntent(name, data);
    console.log(formatOutput(result, format));
  }));

  return command;
}
