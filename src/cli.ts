#!/usr/bin/env node

import { Command, Option } from "commander";
import {
  createStatusCommand,
  createConfigCommand,
  createComponentsCommand,
  createEventsCommand,
  createServicesCommand,
  createStatesCommand,
  createSetStateCommand,
  createDeleteStateCommand,
  createCallServiceCommand,
  createFireEventCommand,
  createRenderTemplateCommand,
  createCheckConfigCommand,
  createHandleIntentCommand,
  createHistoryCommand,
  createLogbookCommand,
  createErrorLogCommand,
  createCalendarsCommand,
  createCalendarEventsCommand,
  createCameraCommand,
  createConfigSetCommand,
  createConfigGetCommand,
  createConfigPathCommand,
} from "./commands/index.js";

const program = new Command();

program
  .name("hassio")
  .description("Agent-optimized CLI tool for interacting with the Home Assistant API")
  .version("1.0.0")
  .addOption(
    new Option("-u, --url <url>", "Home Assistant URL")
      .env("HASSIO_URL")
  )
  .addOption(
    new Option("-t, --token <token>", "Long-lived access token")
      .env("HASSIO_TOKEN")
  )
  .addOption(
    new Option(
      "-f, --format <format>",
      "Output format"
    )
      .choices(["toon", "json", "json-compact", "yaml", "table"])
      .default("toon")
  )
  .addOption(
    new Option("--timeout <ms>", "Request timeout in milliseconds")
      .default(30000)
  )
  .addOption(
    new Option("-c, --config <path>", "Path to config file")
      .default(undefined)
  );

program.addCommand(createStatusCommand());
program.addCommand(createConfigCommand());
program.addCommand(createComponentsCommand());
program.addCommand(createEventsCommand());
program.addCommand(createServicesCommand());
program.addCommand(createStatesCommand());
program.addCommand(createSetStateCommand());
program.addCommand(createDeleteStateCommand());
program.addCommand(createCallServiceCommand());
program.addCommand(createFireEventCommand());
program.addCommand(createRenderTemplateCommand());
program.addCommand(createCheckConfigCommand());
program.addCommand(createHandleIntentCommand());
program.addCommand(createHistoryCommand());
program.addCommand(createLogbookCommand());
program.addCommand(createErrorLogCommand());
program.addCommand(createCalendarsCommand());
program.addCommand(createCalendarEventsCommand());
program.addCommand(createCameraCommand());
program.addCommand(createConfigSetCommand());
program.addCommand(createConfigGetCommand());
program.addCommand(createConfigPathCommand());

program.parse();
