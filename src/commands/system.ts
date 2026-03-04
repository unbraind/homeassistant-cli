import { Command } from "commander";
import { HomeAssistantClient, SystemApiClient, HomeAssistantApiError } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import type { HaState } from "../types/index.js";

export function createRestartCommand(): Command {
  return new Command("restart")
    .description("Restart Home Assistant")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      await client.restartHomeAssistant();
      console.log(formatOutput({ status: "restarting", message: "Home Assistant is restarting" }, format));
    }));
}

export function createStopCommand(): Command {
  return new Command("stop")
    .description("Stop Home Assistant")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      await client.stopHomeAssistant();
      console.log(formatOutput({ status: "stopping", message: "Home Assistant is stopping" }, format));
    }));
}

export function createPersonsCommand(): Command {
  return new Command("persons")
    .description("List all persons (from entity states)")
    .option("--count", "Only return count")
    .action(withExit(async (options: { count?: boolean }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      const states = await client.getStates();
      const persons = states
        .filter((s: HaState) => s.entity_id.startsWith("person."))
        .map((s: HaState) => ({
          entity_id: s.entity_id,
          state: s.state,
          friendly_name: s.attributes["friendly_name"] || s.entity_id,
          device_trackers: s.attributes["device_trackers"] || [],
          user_id: s.attributes["user_id"] || null,
        }));

      if (options.count) {
        console.log(formatOutput({ persons_count: persons.length }, format));
      } else {
        console.log(formatOutput({ persons }, format));
      }
    }));
}

export function createZonesCommand(): Command {
  return new Command("zones")
    .description("List all zones (from entity states)")
    .option("--count", "Only return count")
    .action(withExit(async (options: { count?: boolean }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);

      const states = await client.getStates();
      const zones = states
        .filter((s: HaState) => s.entity_id.startsWith("zone."))
        .map((s: HaState) => ({
          entity_id: s.entity_id,
          state: s.state,
          friendly_name: s.attributes["friendly_name"] || s.entity_id,
          latitude: s.attributes["latitude"],
          longitude: s.attributes["longitude"],
          radius: s.attributes["radius"],
          passive: s.attributes["passive"] || false,
        }));

      if (options.count) {
        console.log(formatOutput({ zones_count: zones.length }, format));
      } else {
        console.log(formatOutput({ zones }, format));
      }
    }));
}

export function createAnalyticsCommand(): Command {
  return new Command("analytics")
    .description("Get Home Assistant analytics data")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new SystemApiClient(config);

      try {
        const analytics = await client.getAnalytics();
        console.log(formatOutput(analytics, format));
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({ 
            message: "Analytics endpoint not available. Enable analytics in Home Assistant settings." 
          }, format));
        } else {
          throw error;
        }
      }
    }));
}

export function createBackupsCommand(): Command {
  const command = new Command("backups")
    .description("Manage Home Assistant backups (via hassio service calls)")
    .option("--list", "List all backups")
    .option("--create <name>", "Create a new backup")
    .option("-r, --restore <id>", "Restore a backup")
    .option("-d, --delete <id>", "Delete a backup")
    .option("--download <id>", "Download a backup")
    .option("-o, --output <file>", "Output file for download")
    .option("--compressed", "Create compressed backup", true)
    .option("--password <password>", "Password for backup (restore/create)")
    .option("--count", "Only return count");

  command.action(withExit(async (options: {
    list?: boolean;
    create?: string;
    restore?: string;
    delete?: string;
    download?: string;
    output?: string;
    compressed?: boolean;
    password?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.create) {
      const data: Record<string, unknown> = { name: options.create };
      if (options.compressed !== undefined) data["compressed"] = options.compressed;
      if (options.password) data["password"] = options.password;
      
      try {
        await client.callService("hassio", "backup_full", data);
        console.log(formatOutput({ created: true, name: options.create }, format));
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({ 
            message: "Backup service not available. Ensure Hass.io/Supervisor is installed." 
          }, format));
        } else {
          throw error;
        }
      }
      return;
    }

    if (options.restore) {
      const data: Record<string, unknown> = { slug: options.restore };
      if (options.password) data["password"] = options.password;
      
      try {
        await client.callService("hassio", "restore_full", data);
        console.log(formatOutput({ restored: options.restore }, format));
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({ 
            message: "Restore service not available. Ensure Hass.io/Supervisor is installed." 
          }, format));
        } else {
          throw error;
        }
      }
      return;
    }

    console.log(formatOutput({ 
      message: "Backup management requires Hass.io/Supervisor. Use 'hassio call-service hassio backup_full' to create backups.",
      hint: "For full backup management, use the Home Assistant UI or Supervisor API directly."
    }, format));
  }));

  return command;
}

export function createSystemLogCommand(): Command {
  const command = new Command("system-log")
    .description("Manage the Home Assistant system log (clear or write entries)")
    .option("--clear", "Clear all system log entries")
    .option("--write <message>", "Write a custom entry to the system log")
    .option("--level <level>", "Log level for written entry (debug, info, warning, error, critical)", "warning")
    .option("--logger <logger>", "Logger name for written entry", "custom");

  command.action(withExit(async (options: {
    clear?: boolean;
    write?: string;
    level?: string;
    logger?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.clear) {
      await client.callService("system_log", "clear", {});
      console.log(formatOutput({ success: true, message: "System log cleared" }, format));
      return;
    }

    if (options.write) {
      const data: Record<string, string> = {
        message: options.write,
        level: options.level ?? "warning",
        logger: options.logger ?? "custom",
      };
      await client.callService("system_log", "write", data);
      console.log(formatOutput({ success: true, written: options.write, level: data["level"] }, format));
      return;
    }

    // Default: show available actions
    console.log(formatOutput({
      message: "Use --clear to clear the log or --write <message> to write an entry",
      available_levels: ["debug", "info", "warning", "error", "critical"],
    }, format));
  }));

  return command;
}

export function createFrontendCommand(): Command {
  const command = new Command("frontend")
    .description("Manage the Home Assistant frontend (themes)")
    .option("--reload-themes", "Reload all custom themes from configuration")
    .option("--set-theme <name>", "Set the active theme by name")
    .option("--dark-theme <name>", "Set the dark mode theme (use with --set-theme)");

  command.action(withExit(async (options: {
    reloadThemes?: boolean;
    setTheme?: string;
    darkTheme?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.reloadThemes) {
      await client.callService("frontend", "reload_themes", {});
      console.log(formatOutput({ success: true, message: "Frontend themes reloaded" }, format));
      return;
    }

    if (options.setTheme) {
      const data: Record<string, string> = { name: options.setTheme };
      if (options.darkTheme) data["name_dark"] = options.darkTheme;
      await client.callService("frontend", "set_theme", data);
      console.log(formatOutput({ success: true, theme: options.setTheme, dark_theme: options.darkTheme }, format));
      return;
    }

    console.log(formatOutput({
      message: "Use --reload-themes to reload themes or --set-theme <name> to activate a theme",
      hint: "Use 'hassio services --domain frontend' to list all available themes",
    }, format));
  }));

  return command;
}
