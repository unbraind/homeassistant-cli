import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createCoverCommand(): Command {
  const command = new Command("cover")
    .description("Control Home Assistant cover entities (blinds, garage doors, shutters)")
    .option("--open <entityId>", "Open a cover")
    .option("--close <entityId>", "Close a cover")
    .option("--stop <entityId>", "Stop a cover mid-movement")
    .option("--toggle <entityId>", "Toggle a cover open/closed")
    .option("-e, --entity-id <entityId>", "Target cover for position operations")
    .option("--position <0-100>", "Set cover position percentage (0=closed, 100=open)")
    .option("--tilt <0-100>", "Set cover tilt position percentage")
    .option("--open-tilt <entityId>", "Open cover tilt")
    .option("--close-tilt <entityId>", "Close cover tilt")
    .option("--stop-tilt <entityId>", "Stop cover tilt movement")
    .option("--count", "Only return count of cover entities")
    .option("-s, --state <state>", "Filter by state (open, closed, opening, closing, stopped)");

  command.action(withExit(async (options: {
    open?: string;
    close?: string;
    stop?: string;
    toggle?: string;
    entityId?: string;
    position?: string;
    tilt?: string;
    openTilt?: string;
    closeTilt?: string;
    stopTilt?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.open) {
      await client.callService("cover", "open_cover", { entity_id: options.open });
      console.log(formatOutput({ success: true, action: "opened", entity_id: options.open }, format));
      return;
    }

    if (options.close) {
      await client.callService("cover", "close_cover", { entity_id: options.close });
      console.log(formatOutput({ success: true, action: "closed", entity_id: options.close }, format));
      return;
    }

    if (options.stop) {
      await client.callService("cover", "stop_cover", { entity_id: options.stop });
      console.log(formatOutput({ success: true, action: "stopped", entity_id: options.stop }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("cover", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.entityId && options.position !== undefined) {
      await client.callService("cover", "set_cover_position", {
        entity_id: options.entityId,
        position: parseInt(options.position, 10),
      });
      console.log(formatOutput({ success: true, action: "set_position", entity_id: options.entityId, position: parseInt(options.position, 10) }, format));
      return;
    }

    if (options.entityId && options.tilt !== undefined) {
      await client.callService("cover", "set_cover_tilt_position", {
        entity_id: options.entityId,
        tilt_position: parseInt(options.tilt, 10),
      });
      console.log(formatOutput({ success: true, action: "set_tilt", entity_id: options.entityId, tilt_position: parseInt(options.tilt, 10) }, format));
      return;
    }

    if (options.openTilt) {
      await client.callService("cover", "open_cover_tilt", { entity_id: options.openTilt });
      console.log(formatOutput({ success: true, action: "opened_tilt", entity_id: options.openTilt }, format));
      return;
    }

    if (options.closeTilt) {
      await client.callService("cover", "close_cover_tilt", { entity_id: options.closeTilt });
      console.log(formatOutput({ success: true, action: "closed_tilt", entity_id: options.closeTilt }, format));
      return;
    }

    if (options.stopTilt) {
      await client.callService("cover", "stop_cover_tilt", { entity_id: options.stopTilt });
      console.log(formatOutput({ success: true, action: "stopped_tilt", entity_id: options.stopTilt }, format));
      return;
    }

    // List covers
    const states = await client.getStates();
    let covers = states.filter(s => s.entity_id.startsWith("cover."));
    if (options.state) covers = covers.filter(c => c.state === options.state);

    const simplified = covers.map(c => ({
      entity_id: c.entity_id,
      state: c.state,
      current_position: c.attributes["current_position"],
      current_tilt_position: c.attributes["current_tilt_position"],
      device_class: c.attributes["device_class"],
      friendly_name: c.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ covers_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ covers: simplified }, format));
  }));

  return command;
}
