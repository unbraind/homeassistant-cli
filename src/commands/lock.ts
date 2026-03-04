import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createLockCommand(): Command {
  const command = new Command("lock")
    .description("Control Home Assistant lock entities")
    .option("--lock <entityId>", "Lock a lock")
    .option("--unlock <entityId>", "Unlock a lock")
    .option("--open <entityId>", "Open/release a lock (if supported)")
    .option("--code <code>", "Access code (use with --lock, --unlock, or --open)")
    .option("--count", "Only return count of lock entities")
    .option("-s, --state <state>", "Filter by state (locked, unlocked, locking, unlocking, jammed)");

  command.action(withExit(async (options: {
    lock?: string;
    unlock?: string;
    open?: string;
    code?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.lock) {
      const data: Record<string, unknown> = { entity_id: options.lock };
      if (options.code) data["code"] = options.code;
      await client.callService("lock", "lock", data);
      console.log(formatOutput({ success: true, action: "locked", entity_id: options.lock }, format));
      return;
    }

    if (options.unlock) {
      const data: Record<string, unknown> = { entity_id: options.unlock };
      if (options.code) data["code"] = options.code;
      await client.callService("lock", "unlock", data);
      console.log(formatOutput({ success: true, action: "unlocked", entity_id: options.unlock }, format));
      return;
    }

    if (options.open) {
      const data: Record<string, unknown> = { entity_id: options.open };
      if (options.code) data["code"] = options.code;
      await client.callService("lock", "open", data);
      console.log(formatOutput({ success: true, action: "opened", entity_id: options.open }, format));
      return;
    }

    // List locks
    const states = await client.getStates();
    let locks = states.filter(s => s.entity_id.startsWith("lock."));
    if (options.state) locks = locks.filter(l => l.state === options.state);

    const simplified = locks.map(l => ({
      entity_id: l.entity_id,
      state: l.state,
      changed_by: l.attributes["changed_by"],
      device_class: l.attributes["device_class"],
      friendly_name: l.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ locks_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ locks: simplified }, format));
  }));

  return command;
}
