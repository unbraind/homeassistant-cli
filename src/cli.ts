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
  createDoctorCommand,
  createWizardCommand,
  createInitCommand,
  createValidateCommand,
  createResetCommand,
  createListCommand,
  createEntitiesCommand,
  createBatchCommand,
  createQueryCommand,
  createDiscoverCommand,
  createRegistriesCommand,
  createStatisticsCommand,
  createTodoCommand,
  createShoppingListCommand,
  createNotificationsCommand,
  createPersonsCommand,
  createZonesCommand,
  createAnalyticsCommand,
  createBackupsCommand,
  createConversationCommand,
  createAskCommand,
  createSearchCommand,
  createFindCommand,
  createTtsCommand,
  createSayCommand,
  createAutomationsCommand,
  createScriptsCommand,
  createScenesCommand,
  createSchemaCommand,
  createActionCommand,
  createEnergyCommand,
  createWeatherCommand,
  createHealthCommand,
  createInfoCommand,
  createRestartCommand,
  createStopCommand,
  createNotifyCommand,
  createSupervisorCommand,
  createWebsocketCommand,
  createConfigEntriesCommand,
  createCapabilitiesCommand,
  createAreaCreateCommand,
  createAreaUpdateCommand,
  createAreaDeleteCommand,
  createFloorCreateCommand,
  createFloorUpdateCommand,
  createFloorDeleteCommand,
  createLabelCreateCommand,
  createLabelUpdateCommand,
  createLabelDeleteCommand,
  createPipelineCommand,
  createTimersCommand,
  createInputCommand,
  createLightCommand,
  createSwitchCommand,
  createClimateCommand,
  createCoverCommand,
  createLockCommand,
  createFanCommand,
  createMediaPlayerCommand,
  createUpdateCommand,
  createButtonCommand,
  createNumberCommand,
  createSelectCommand,
  createRemoteCommand,
  createSensorCommand,
  createBinarySensorCommand,
  createCounterCommand,
  createSirenCommand,
  createAiTaskCommand,
  createEventEntityCommand,
  createVacuumCommand,
  createValveCommand,
  createWaterHeaterCommand,
  createDeviceTrackerCommand,
  createSunCommand,
  createLoggerCommand,
  createRecorderCommand,
  createMqttCommand,
  createScheduleCommand,
  createUtilityMeterCommand,
} from "./commands/index.js";
import { createInspectCommand, createSummaryCommand } from "./commands/inspect.js";

const program = new Command();

program
  .name("hassio")
  .description("Agent-optimized CLI tool for interacting with the Home Assistant API")
  .version("2026.3.4-54")
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
      .choices(["toon", "json", "json-compact", "yaml", "table", "markdown"])
  )
  .addOption(
    new Option("--timeout <ms>", "Request timeout in milliseconds")
      .env("HASSIO_TIMEOUT")
  )
  .addOption(
    new Option("--read-only", "Block all state-changing API calls")
      .env("HASSIO_READONLY")
  )
  .addOption(
    new Option("-c, --config <path>", "Path to config file")
      .env("HASSIO_CONFIG")
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
settingsCmd.addCommand(createDoctorCommand());
settingsCmd.addCommand(createResetCommand());
settingsCmd.addCommand(createListCommand());
program.addCommand(settingsCmd);

// LLM/Agent optimized commands
program.addCommand(createEntitiesCommand());
program.addCommand(createBatchCommand());
program.addCommand(createQueryCommand());
program.addCommand(createDiscoverCommand());
program.addCommand(createInspectCommand());
program.addCommand(createSummaryCommand());

// Registries
program.addCommand(createRegistriesCommand());

// Registry CRUD operations
program.addCommand(createAreaCreateCommand());
program.addCommand(createAreaUpdateCommand());
program.addCommand(createAreaDeleteCommand());
program.addCommand(createFloorCreateCommand());
program.addCommand(createFloorUpdateCommand());
program.addCommand(createFloorDeleteCommand());
program.addCommand(createLabelCreateCommand());
program.addCommand(createLabelUpdateCommand());
program.addCommand(createLabelDeleteCommand());

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

// Conversation & Voice
program.addCommand(createConversationCommand());
program.addCommand(createAskCommand());
program.addCommand(createPipelineCommand());

// Search
program.addCommand(createSearchCommand());
program.addCommand(createFindCommand());

// TTS (Text-to-Speech)
program.addCommand(createTtsCommand());
program.addCommand(createSayCommand());

// Automation, Scripts, Scenes
program.addCommand(createAutomationsCommand());
program.addCommand(createScriptsCommand());
program.addCommand(createScenesCommand());

// LLM Schema and Actions
program.addCommand(createSchemaCommand());
program.addCommand(createActionCommand());

// Extended Commands (Energy, Weather, Health, Info)
program.addCommand(createEnergyCommand());
program.addCommand(createWeatherCommand());
program.addCommand(createHealthCommand());
program.addCommand(createInfoCommand());

program.addCommand(createRestartCommand());
program.addCommand(createStopCommand());
program.addCommand(createNotifyCommand());
program.addCommand(createSupervisorCommand());
program.addCommand(createWebsocketCommand());
program.addCommand(createConfigEntriesCommand());
program.addCommand(createCapabilitiesCommand());

// Timers & Input Helpers
program.addCommand(createTimersCommand());
program.addCommand(createInputCommand());

// Device Control Commands
program.addCommand(createLightCommand());
program.addCommand(createSwitchCommand());
program.addCommand(createClimateCommand());
program.addCommand(createCoverCommand());
program.addCommand(createLockCommand());
program.addCommand(createFanCommand());
program.addCommand(createMediaPlayerCommand());
program.addCommand(createRemoteCommand());

// Helper Entity Commands
program.addCommand(createButtonCommand());
program.addCommand(createNumberCommand());
program.addCommand(createSelectCommand());
program.addCommand(createUpdateCommand());

// Sensor Browse Commands
program.addCommand(createSensorCommand());
program.addCommand(createBinarySensorCommand());

// New Domain Commands
program.addCommand(createCounterCommand());
program.addCommand(createSirenCommand());
program.addCommand(createAiTaskCommand());
program.addCommand(createEventEntityCommand());
program.addCommand(createVacuumCommand());
program.addCommand(createValveCommand());
program.addCommand(createWaterHeaterCommand());
program.addCommand(createDeviceTrackerCommand());
program.addCommand(createSunCommand());
program.addCommand(createLoggerCommand());
program.addCommand(createRecorderCommand());
program.addCommand(createMqttCommand());
program.addCommand(createScheduleCommand());
program.addCommand(createUtilityMeterCommand());

program.parseAsync(process.argv).catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
