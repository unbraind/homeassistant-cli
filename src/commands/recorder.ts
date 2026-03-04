import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createRecorderCommand(): Command {
  const command = new Command("recorder")
    .description("Manage the Home Assistant recorder (database purge, enable/disable recording)")
    .option("--purge", "Purge old recorder data from the database")
    .option("--keep-days <n>", "Number of days of data to keep when purging (default: use HA configuration)")
    .option("--repack", "Repack the database after purging (reclaims disk space)")
    .option("--purge-entities <entityIds>", "Purge specific entity IDs from the database (comma-separated)")
    .option("--enable", "Enable the recorder")
    .option("--disable", "Disable the recorder");

  command.action(withExit(async (options: {
    purge?: boolean;
    keepDays?: string;
    repack?: boolean;
    purgeEntities?: string;
    enable?: boolean;
    disable?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.purge) {
      const serviceData: Record<string, unknown> = {};
      if (options.keepDays !== undefined) {
        const days = parseInt(options.keepDays, 10);
        if (isNaN(days) || days < 0) {
          console.error("Error: --keep-days must be a non-negative integer");
          process.exit(1);
          return;
        }
        serviceData["keep_days"] = days;
      }
      if (options.repack) serviceData["repack"] = true;
      await client.callService("recorder", "purge", serviceData);
      console.log(formatOutput({ success: true, action: "purge", ...serviceData }, format));
      return;
    }

    if (options.purgeEntities) {
      const entityIds = options.purgeEntities.split(",").map(e => e.trim()).filter(Boolean);
      if (entityIds.length === 0) {
        console.error("Error: --purge-entities requires at least one entity ID");
        process.exit(1);
        return;
      }
      await client.callService("recorder", "purge_entities", { entity_id: entityIds });
      console.log(formatOutput({ success: true, action: "purge_entities", entity_ids: entityIds }, format));
      return;
    }

    if (options.enable) {
      await client.callService("recorder", "enable", {});
      console.log(formatOutput({ success: true, action: "enabled" }, format));
      return;
    }

    if (options.disable) {
      await client.callService("recorder", "disable", {});
      console.log(formatOutput({ success: true, action: "disabled" }, format));
      return;
    }

    console.error("Error: specify --purge, --purge-entities <ids>, --enable, or --disable");
    process.exit(1);
  }));

  return command;
}
