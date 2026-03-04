import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createValveCommand(): Command {
  const command = new Command("valve")
    .description("Control Home Assistant valve entities")
    .option("--open <entityId>", "Open a valve")
    .option("--close <entityId>", "Close a valve")
    .option("--stop <entityId>", "Stop valve movement")
    .option("--toggle <entityId>", "Toggle a valve open/closed")
    .option("-e, --entity-id <entityId>", "Target valve for position operations")
    .option("--position <0-100>", "Set valve position percentage (0=closed, 100=open)")
    .option("--count", "Only return count of valve entities")
    .option("-s, --state <state>", "Filter by state (open, closed, opening, closing, stopped)");

  command.action(withExit(async (options: {
    open?: string;
    close?: string;
    stop?: string;
    toggle?: string;
    entityId?: string;
    position?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.open) {
      await client.callService("valve", "open_valve", { entity_id: options.open });
      console.log(formatOutput({ success: true, action: "opened", entity_id: options.open }, format));
      return;
    }

    if (options.close) {
      await client.callService("valve", "close_valve", { entity_id: options.close });
      console.log(formatOutput({ success: true, action: "closed", entity_id: options.close }, format));
      return;
    }

    if (options.stop) {
      await client.callService("valve", "stop_valve", { entity_id: options.stop });
      console.log(formatOutput({ success: true, action: "stopped", entity_id: options.stop }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("valve", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.entityId && options.position !== undefined) {
      await client.callService("valve", "set_valve_position", {
        entity_id: options.entityId,
        position: parseInt(options.position, 10),
      });
      console.log(formatOutput({
        success: true,
        action: "set_position",
        entity_id: options.entityId,
        position: parseInt(options.position, 10),
      }, format));
      return;
    }

    // List valve entities
    const states = await client.getStates();
    let valves = states.filter(s => s.entity_id.startsWith("valve."));
    if (options.state) valves = valves.filter(v => v.state === options.state);

    const simplified = valves.map(v => ({
      entity_id: v.entity_id,
      state: v.state,
      current_valve_position: v.attributes["current_valve_position"],
      device_class: v.attributes["device_class"],
      friendly_name: v.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ valves_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ valves: simplified }, format));
  }));

  return command;
}
