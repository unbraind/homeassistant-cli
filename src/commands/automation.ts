import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { AutomationApiClient } from "../api/automation.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new AutomationApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createAutomationsCommand(): Command {
  const command = new Command("automations")
    .description("Manage Home Assistant automations")
    .option("--list", "List all automations")
    .option("--on <entity>", "Turn on automation")
    .option("--off <entity>", "Turn off automation")
    .option("--toggle <entity>", "Toggle automation")
    .option("--trigger <entity>", "Trigger automation")
    .option("--reload", "Reload all automations")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    on?: string;
    off?: string;
    toggle?: string;
    trigger?: string;
    reload?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.on) {
      await client.turnOnAutomation(options.on);
      console.log(formatOutput({ success: true, action: "turned_on", entity: options.on }, format));
      return;
    }

    if (options.off) {
      await client.turnOffAutomation(options.off);
      console.log(formatOutput({ success: true, action: "turned_off", entity: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.toggleAutomation(options.toggle);
      console.log(formatOutput({ success: true, action: "toggled", entity: options.toggle }, format));
      return;
    }

    if (options.trigger) {
      await client.triggerAutomation(options.trigger);
      console.log(formatOutput({ success: true, action: "triggered", entity: options.trigger }, format));
      return;
    }

    if (options.reload) {
      await client.reloadAutomations();
      console.log(formatOutput({ success: true, action: "reloaded", domain: "automation" }, format));
      return;
    }

    const automations = await client.getAutomations();

    if (options.count) {
      console.log(formatOutput({ automations_count: automations.length }, format));
      return;
    }

    const result = automations.map(a => ({
      entity_id: a.entity_id,
      state: a.state,
      last_triggered: a.last_triggered,
      friendly_name: a.attributes["friendly_name"] || a.entity_id,
    }));

    console.log(formatOutput({ automations: result }, format));
  });

  return command;
}

export function createScriptsCommand(): Command {
  const command = new Command("scripts")
    .description("Manage Home Assistant scripts")
    .option("--list", "List all scripts")
    .option("--run <entity>", "Execute a script")
    .option("-d, --data <json>", "JSON variables for script")
    .option("--reload", "Reload all scripts")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    run?: string;
    data?: string;
    reload?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.run) {
      const variables = options.data ? JSON.parse(options.data) as Record<string, unknown> : undefined;
      await client.executeScript(options.run, variables);
      console.log(formatOutput({ success: true, action: "executed", entity: options.run }, format));
      return;
    }

    if (options.reload) {
      await client.reloadScripts();
      console.log(formatOutput({ success: true, action: "reloaded", domain: "script" }, format));
      return;
    }

    const scripts = await client.getScripts();

    if (options.count) {
      console.log(formatOutput({ scripts_count: scripts.length }, format));
      return;
    }

    const result = scripts.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      last_triggered: s.last_triggered,
      friendly_name: s.attributes["friendly_name"] || s.entity_id,
    }));

    console.log(formatOutput({ scripts: result }, format));
  });

  return command;
}

export function createScenesCommand(): Command {
  const command = new Command("scenes")
    .description("Manage Home Assistant scenes")
    .option("--list", "List all scenes")
    .option("--apply <entity>", "Apply a scene")
    .option("--reload", "Reload all scenes")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    apply?: string;
    reload?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.apply) {
      await client.applyScene(options.apply);
      console.log(formatOutput({ success: true, action: "applied", entity: options.apply }, format));
      return;
    }

    if (options.reload) {
      await client.reloadScenes();
      console.log(formatOutput({ success: true, action: "reloaded", domain: "scene" }, format));
      return;
    }

    const scenes = await client.getScenes();

    if (options.count) {
      console.log(formatOutput({ scenes_count: scenes.length }, format));
      return;
    }

    const result = scenes.map(s => ({
      entity_id: s.entity_id,
      friendly_name: s.attributes["friendly_name"] || s.entity_id,
    }));

    console.log(formatOutput({ scenes: result }, format));
  });

  return command;
}
