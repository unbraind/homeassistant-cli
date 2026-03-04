import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { HomeAssistantClient } from "../api/index.js";
import { formatCalendars, formatCalendarEvents, formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createCalendarsCommand(): Command {
  return new Command("calendars")
    .description("Get list of calendar entities")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);
      const result = await client.getCalendars();
      console.log(formatCalendars(result, format));
    }));
}

export function createCalendarEventsCommand(): Command {
  const command = new Command("calendar-events")
    .description("Get events from a calendar")
    .argument("<entity-id>", "Calendar entity ID")
    .requiredOption("-s, --start <datetime>", "Start datetime (ISO format)")
    .requiredOption("-e, --end <datetime>", "End datetime (ISO format)");

  command.action(
    withExit(async (entityId: string, options: { start: string; end: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      const result = await client.getCalendarEvents(
        entityId,
        options.start,
        options.end
      );
      console.log(formatCalendarEvents(result, format));
    })
  );

  return command;
}

export function createCameraCommand(): Command {
  const command = new Command("camera")
    .description("Get camera image")
    .argument("<entity-id>", "Camera entity ID")
    .option("-o, --output <file>", "Output file path");

  command.action(
    withExit(async (entityId: string, options: { output?: string }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      const buffer = await client.getCameraImage(entityId);

      if (options.output) {
        writeFileSync(options.output, buffer);
        console.log(formatOutput({ saved: true, path: options.output, bytes: buffer.length }, format));
      } else {
        process.stdout.write(buffer);
      }
    })
  );

  return command;
}
