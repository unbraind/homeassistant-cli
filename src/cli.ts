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
  createWizardCommand,
  createInitCommand,
  createValidateCommand,
  createEntitiesCommand,
  createBatchCommand,
  createQueryCommand,
  createDiscoverCommand,
  createInspectCommand,
  createRegistriesCommand,
  createStatisticsCommand,
  createTodoCommand,
  createShoppingListCommand,
  createNotificationsCommand,
  createPersonsCommand,
  createZonesCommand,
  createAnalyticsCommand,
  createBackupsCommand,
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
      .env("HASSIO_TIMEOUT")
      .default(30000)
  )
  .addOption(
    new Option("-c, --config <path>", "Path to config file")
      .env("HASSIO_CONFIG")
      .default(undefined)
  );

// Core API commands
program.addCommand(createStatusCommand());
program.addCommand(createConfigCommand());
program.addCommand(createComponentsCommand());
program.addCommand(createEventsCommand());
program.addCommand(createServicesCommand());

// State commands
program.addCommand(createStatesCommand());
program.addCommand(createSetStateCommand());
program.addCommand(createDeleteStateCommand());

// Service commands
program.addCommand(createCallServiceCommand());
program.addCommand(createFireEventCommand());
program.addCommand(createRenderTemplateCommand());
program.addCommand(createCheckConfigCommand());
program.addCommand(createHandleIntentCommand());

// History & Logs
program.addCommand(createHistoryCommand());
program.addCommand(createLogbookCommand());
program.addCommand(createErrorLogCommand());

// Calendar & Media
program.addCommand(createCalendarsCommand());
program.addCommand(createCalendarEventsCommand());
program.addCommand(createCameraCommand());

// Settings commands
const settingsCmd = new Command("settings")
  .description("Configuration management commands");
settingsCmd.addCommand(createConfigSetCommand());
settingsCmd.addCommand(createConfigGetCommand());
settingsCmd.addCommand(createConfigPathCommand());
settingsCmd.addCommand(createWizardCommand());
settingsCmd.addCommand(createInitCommand());
settingsCmd.addCommand(createValidateCommand());
program.addCommand(settingsCmd);

// LLM/Agent optimized commands
program.addCommand(createEntitiesCommand());
program.addCommand(createBatchCommand());
program.addCommand(createQueryCommand());
program.addCommand(createDiscoverCommand());
program.addCommand(createInspectCommand());

// Registries
program.addCommand(createRegistriesCommand());

// Statistics
program.addCommand(createStatisticsCommand());

// Lists (Todo, Shopping, Notifications)
program.addCommand(createTodoCommand());
program.addCommand(createShoppingListCommand());
program.addCommand(createNotificationsCommand());

// System (Persons, Zones, Analytics, Backups)
program.addCommand(createPersonsCommand());
program.addCommand(createZonesCommand());
program.addCommand(createAnalyticsCommand());
program.addCommand(createBackupsCommand());

program.parse();
