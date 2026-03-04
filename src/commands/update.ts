import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createUpdateCommand(): Command {
  const command = new Command("update")
    .description("Manage Home Assistant update entities (software updates)")
    .option("--install <entityId>", "Install an available update")
    .option("--version <version>", "Specific version to install (use with --install or --entity-id)")
    .option("--backup", "Create backup before installing (use with --install)")
    .option("--skip <entityId>", "Skip (ignore) the current available update")
    .option("--clear-skipped <entityId>", "Clear previously skipped update version")
    .option("-e, --entity-id <entityId>", "Target update entity (for --install with --version)")
    .option("--pending", "Only show entities with available updates (state=on)")
    .option("--count", "Only return count of update entities");

  command.action(withExit(async (options: {
    install?: string;
    version?: string;
    backup?: boolean;
    skip?: string;
    clearSkipped?: string;
    entityId?: string;
    pending?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.install) {
      const data: Record<string, unknown> = { entity_id: options.install };
      if (options.version) data["version"] = options.version;
      if (options.backup) data["backup"] = true;
      await client.callService("update", "install", data);
      console.log(formatOutput({ success: true, action: "install_started", entity_id: options.install, version: options.version ?? null }, format));
      return;
    }

    if (options.entityId && options.version) {
      const data: Record<string, unknown> = { entity_id: options.entityId, version: options.version };
      if (options.backup) data["backup"] = true;
      await client.callService("update", "install", data);
      console.log(formatOutput({ success: true, action: "install_started", entity_id: options.entityId, version: options.version }, format));
      return;
    }

    if (options.skip) {
      await client.callService("update", "skip", { entity_id: options.skip });
      console.log(formatOutput({ success: true, action: "skipped", entity_id: options.skip }, format));
      return;
    }

    if (options.clearSkipped) {
      await client.callService("update", "clear_skipped", { entity_id: options.clearSkipped });
      console.log(formatOutput({ success: true, action: "cleared_skipped", entity_id: options.clearSkipped }, format));
      return;
    }

    // List update entities
    const states = await client.getStates();
    let updates = states.filter(s => s.entity_id.startsWith("update."));
    if (options.pending) updates = updates.filter(u => u.state === "on");

    const simplified = updates.map(u => ({
      entity_id: u.entity_id,
      state: u.state,
      friendly_name: u.attributes["friendly_name"],
      installed_version: u.attributes["installed_version"],
      latest_version: u.attributes["latest_version"],
      title: u.attributes["title"],
      release_url: u.attributes["release_url"],
      auto_update: u.attributes["auto_update"],
      skipped_version: u.attributes["skipped_version"],
      in_progress: u.attributes["in_progress"],
    }));

    if (options.count) {
      console.log(formatOutput({ updates_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ updates: simplified }, format));
  }));

  return command;
}
