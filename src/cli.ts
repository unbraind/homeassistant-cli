#!/usr/bin/env node
/**
 * Builds and runs the complete Home Assistant command-line interface.
 */

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
  createSetupCommand,
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
  createSystemLogCommand,
  createFrontendCommand,
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
import { attachGlobalFlagsHelp } from "./utils/command-helpers.js";
import { maybePromptToStarRepo } from "./utils/github-star.js";

/** Build a fresh Commander program for embedding, testing, or CLI execution. */
export function createProgram(): Command {
const program = new Command();

program
  .name("hassio")
  .description("Agent-optimized CLI tool for interacting with the Home Assistant API")
  .version("2026.7.21-2")
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
const settingsCmd = new Command("settings")
  .description("Configuration management commands");
settingsCmd.addCommand(createConfigSetCommand());
settingsCmd.addCommand(createConfigGetCommand());
settingsCmd.addCommand(createConfigPathCommand());
settingsCmd.addCommand(createWizardCommand());
settingsCmd.addCommand(createSetupCommand());
settingsCmd.addCommand(createInitCommand());
settingsCmd.addCommand(createValidateCommand());
settingsCmd.addCommand(createDoctorCommand());
settingsCmd.addCommand(createResetCommand());
settingsCmd.addCommand(createListCommand());
program.addCommand(settingsCmd);
program.addCommand(createEntitiesCommand());
program.addCommand(createBatchCommand());
program.addCommand(createQueryCommand());
program.addCommand(createDiscoverCommand());
program.addCommand(createInspectCommand());
program.addCommand(createSummaryCommand());
program.addCommand(createRegistriesCommand());
program.addCommand(createAreaCreateCommand());
program.addCommand(createAreaUpdateCommand());
program.addCommand(createAreaDeleteCommand());
program.addCommand(createFloorCreateCommand());
program.addCommand(createFloorUpdateCommand());
program.addCommand(createFloorDeleteCommand());
program.addCommand(createLabelCreateCommand());
program.addCommand(createLabelUpdateCommand());
program.addCommand(createLabelDeleteCommand());
program.addCommand(createStatisticsCommand());
program.addCommand(createTodoCommand());
program.addCommand(createShoppingListCommand());
program.addCommand(createNotificationsCommand());
program.addCommand(createPersonsCommand());
program.addCommand(createZonesCommand());
program.addCommand(createAnalyticsCommand());
program.addCommand(createBackupsCommand());
program.addCommand(createConversationCommand());
program.addCommand(createAskCommand());
program.addCommand(createPipelineCommand());
program.addCommand(createSearchCommand());
program.addCommand(createFindCommand());
program.addCommand(createTtsCommand());
program.addCommand(createSayCommand());
program.addCommand(createAutomationsCommand());
program.addCommand(createScriptsCommand());
program.addCommand(createScenesCommand());
program.addCommand(createSchemaCommand());
program.addCommand(createActionCommand());
program.addCommand(createEnergyCommand());
program.addCommand(createWeatherCommand());
program.addCommand(createHealthCommand());
program.addCommand(createInfoCommand());

program.addCommand(createRestartCommand());
program.addCommand(createStopCommand());
program.addCommand(createNotifyCommand());
program.addCommand(createSystemLogCommand());
program.addCommand(createFrontendCommand());
program.addCommand(createSupervisorCommand());
program.addCommand(createWebsocketCommand());
program.addCommand(createConfigEntriesCommand());
program.addCommand(createCapabilitiesCommand());
program.addCommand(createTimersCommand());
program.addCommand(createInputCommand());
program.addCommand(createLightCommand());
program.addCommand(createSwitchCommand());
program.addCommand(createClimateCommand());
program.addCommand(createCoverCommand());
program.addCommand(createLockCommand());
program.addCommand(createFanCommand());
program.addCommand(createMediaPlayerCommand());
program.addCommand(createRemoteCommand());
program.addCommand(createButtonCommand());
program.addCommand(createNumberCommand());
program.addCommand(createSelectCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createSensorCommand());
program.addCommand(createBinarySensorCommand());
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

attachGlobalFlagsHelp(program);
return program;
}

/** Resolve the config path before Commander parsing so startup prompts use the same files. */
export function getConfigPathFromArgv(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--config" || current === "-c") {
      return argv[i + 1];
    }
    if (current?.startsWith("--config=")) {
      return current.slice("--config=".length);
    }
  }
  return undefined;
}

/** Execute the CLI with an injectable argv vector. */
export async function runCli(argv: string[] = process.argv): Promise<void> {
  const configPath = getConfigPathFromArgv(argv);
  await maybePromptToStarRepo(configPath ? { configPath } : undefined);
  await createProgram().parseAsync(argv);
}

/** Render an uncaught CLI failure consistently and select the failing exit status. */
export function reportCliError(error: unknown): void {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (process.env["HASSIO_CLI_SKIP_AUTO_RUN"] !== "1") {
  runCli().catch(reportCliError);
}
