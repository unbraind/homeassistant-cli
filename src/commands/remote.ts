/**
 * Defines the remote command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createRemoteCommand(): Command {
  const command = new Command("remote")
    .description("Control Home Assistant remote entities (IR/RF blasters)")
    .option("--on <entityId>", "Turn on a remote")
    .option("--off <entityId>", "Turn off a remote")
    .option("--toggle <entityId>", "Toggle a remote")
    .option("-e, --entity-id <entityId>", "Target remote entity for command operations")
    .option("--send <command>", "Send a command (use with --entity-id; multiple commands: comma-separated)")
    .option("--device <device>", "Device name to send command to (use with --send)")
    .option("--num-repeats <n>", "Number of times to repeat command (use with --send)")
    .option("--delay-secs <seconds>", "Delay between repeats in seconds (use with --send)")
    .option("--hold-secs <seconds>", "Time to hold the button in seconds (use with --send)")
    .option("--learn <command>", "Learn a new command (use with --entity-id)")
    .option("--learn-device <device>", "Device name for learned command")
    .option("--delete <command>", "Delete a learned command (use with --entity-id)")
    .option("--delete-device <device>", "Device name for command to delete")
    .option("--count", "Only return count of remote entities")
    .option("-s, --state <state>", "Filter listed remotes by state (on, off)");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    toggle?: string;
    entityId?: string;
    send?: string;
    device?: string;
    numRepeats?: string;
    delaySecs?: string;
    holdSecs?: string;
    learn?: string;
    learnDevice?: string;
    delete?: string;
    deleteDevice?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      await client.callService("remote", "turn_on", { entity_id: options.on });
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("remote", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("remote", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.entityId && options.send) {
      const data: Record<string, unknown> = {
        entity_id: options.entityId,
        command: options.send.split(",").map(c => c.trim()),
      };
      if (options.device) data["device"] = options.device;
      if (options.numRepeats) data["num_repeats"] = parseInt(options.numRepeats, 10);
      if (options.delaySecs) data["delay_secs"] = parseFloat(options.delaySecs);
      if (options.holdSecs) data["hold_secs"] = parseFloat(options.holdSecs);
      await client.callService("remote", "send_command", data);
      console.log(formatOutput({ success: true, action: "command_sent", entity_id: options.entityId, command: options.send }, format));
      return;
    }

    if (options.entityId && options.learn) {
      const data: Record<string, unknown> = { entity_id: options.entityId, command: [options.learn] };
      if (options.learnDevice) data["device"] = options.learnDevice;
      await client.callService("remote", "learn_command", data);
      console.log(formatOutput({ success: true, action: "learning_command", entity_id: options.entityId, command: options.learn }, format));
      return;
    }

    if (options.entityId && options.delete) {
      const data: Record<string, unknown> = { entity_id: options.entityId, command: [options.delete] };
      if (options.deleteDevice) data["device"] = options.deleteDevice;
      await client.callService("remote", "delete_command", data);
      console.log(formatOutput({ success: true, action: "command_deleted", entity_id: options.entityId, command: options.delete }, format));
      return;
    }

    // List remote entities
    const states = await client.getStates();
    let remotes = states.filter(s => s.entity_id.startsWith("remote."));
    if (options.state) remotes = remotes.filter(r => r.state === options.state);

    const simplified = remotes.map(r => ({
      entity_id: r.entity_id,
      state: r.state,
      friendly_name: r.attributes["friendly_name"],
      current_activity: r.attributes["current_activity"],
      activity_list: r.attributes["activity_list"],
    }));

    if (options.count) {
      console.log(formatOutput({ remotes_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ remotes: simplified }, format));
  }));

  return command;
}
