import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat, HaState, HaService } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createSchemaCommand(): Command {
  const command = new Command("schema")
    .description("Export CLI schema for LLM/agent consumption")
    .option("--commands", "Export command schema")
    .option("--services", "Export service schema from HA")
    .option("--entities", "Export entity schema summary")
    .option("--full", "Export full schema (all of the above)");

  command.action(async (options: {
    commands?: boolean;
    services?: boolean;
    entities?: boolean;
    full?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const format = getFormat(globalOpts);

    const showAll = !options.commands && !options.services && !options.entities && !options.full;
    const showCommands = options.commands || options.full || showAll;
    const showServices = options.services || options.full;
    const showEntities = options.entities || options.full;

    const result: Record<string, unknown> = {};

    if (showCommands) {
      result["commands"] = getCommandSchema();
    }

    if (showServices || showEntities) {
      const client = getClient(globalOpts);

      if (showServices) {
        const services = await client.getServices();
        result["services"] = services.reduce((acc: Record<string, string[]>, s: HaService) => {
          acc[s.domain] = s.services;
          return acc;
        }, {});
      }

      if (showEntities) {
        const states = await client.getStates();
        const domainCounts = states.reduce((acc: Record<string, number>, s: HaState) => {
          const domain = s.entity_id.split(".")[0] || "unknown";
          acc[domain] = (acc[domain] || 0) + 1;
          return acc;
        }, {});
        result["entity_domains"] = domainCounts;
        result["total_entities"] = states.length;
      }
    }

    console.log(formatOutput(result, format));
  });

  return command;
}

function getCommandSchema(): Record<string, unknown> {
  return {
    global_options: [
      { name: "url", description: "Home Assistant URL", env: "HASSIO_URL" },
      { name: "token", description: "Long-lived access token", env: "HASSIO_TOKEN" },
      { name: "format", description: "Output format", choices: ["toon", "json", "json-compact", "yaml", "table"], default: "toon" },
      { name: "timeout", description: "Request timeout in ms", default: 30000 },
    ],
    commands: {
      status: { description: "Check API status" },
      config: { description: "Get HA configuration" },
      components: { description: "List loaded components" },
      events: { description: "List available events" },
      services: { description: "List available services" },
      states: { description: "Get entity states", args: ["[entity-id]"] },
      "set-state": { description: "Set entity state", args: ["<entity-id>", "<state>"], options: ["-a, --attributes <json>"] },
      "delete-state": { description: "Delete entity state", args: ["<entity-id>"] },
      "call-service": { description: "Call a service", args: ["<domain>", "<service>"], options: ["-e, --entity-id <entity>", "-d, --data <json>", "-r, --return-response"] },
      "fire-event": { description: "Fire an event", args: ["<event-type>"], options: ["-d, --data <json>"] },
      "render-template": { description: "Render Jinja2 template", args: ["<template>"], options: ["-f, --file <path>"] },
      "check-config": { description: "Validate HA configuration" },
      "handle-intent": { description: "Handle intent", args: ["<name>"], options: ["-d, --data <json>"] },
      history: { description: "Get state history", options: ["-e, --entity-id <entities>", "-s, --start-time <timestamp>", "-t, --end-time <timestamp>"] },
      logbook: { description: "Get logbook entries", options: ["-e, --entity-id <entity>", "-s, --start-time <timestamp>", "-t, --end-time <timestamp>"] },
      "error-log": { description: "Get error log" },
      calendars: { description: "List calendars" },
      "calendar-events": { description: "Get calendar events", args: ["<entity-id>"], options: ["-s, --start <datetime>", "-e, --end <datetime>"] },
      camera: { description: "Get camera image", args: ["<entity-id>"], options: ["-o, --output <file>"] },
      entities: { description: "List/filter entities (LLM-optimized)", options: ["-d, --domain <domain>", "-s, --state <state>", "-p, --pattern <pattern>", "--count", "--domains"] },
      batch: { description: "Execute batch service calls", options: ["-d, --domain <domain>", "-s, --service <service>", "-e, --entities <entities>", "--data <json>"] },
      query: { description: "Query with expressions", args: ["<expression>"], options: ["--summary"] },
      discover: { description: "Discover all entities", options: ["--domains", "--unavailable"] },
      inspect: { description: "Deep inspect entity", args: ["<entity-id>"], options: ["--history", "-l, --limit <n>"] },
      find: { description: "Quick search entities", args: ["<pattern>"], options: ["-d, --domain <domain>", "-s, --state <state>", "--count"] },
      ask: { description: "Ask voice assistant", args: ["<text>"], options: ["-a, --agent-id <agentId>"] },
      say: { description: "Speak via TTS", args: ["<message>"], options: ["-p, --player <entity>", "-e, --engine <engine>"] },
      automations: { description: "Manage automations", options: ["--list", "--on <entity>", "--off <entity>", "--trigger <entity>", "--reload", "--count"] },
      scripts: { description: "Manage scripts", options: ["--list", "--run <entity>", "-d, --data <json>", "--reload", "--count"] },
      scenes: { description: "Manage scenes", options: ["--list", "--apply <entity>", "--reload", "--count"] },
      "shopping-list": { description: "Manage shopping list", options: ["--list", "--pending", "--completed", "-a, --add <name>", "-u, --update <id>", "--complete", "--incomplete", "-d, --delete <id>", "--clear-completed", "--count"] },
      notifications: { description: "Manage notifications", options: ["--list", "-d, --dismiss <id>", "--count"] },
      backups: { description: "Manage backups", options: ["--list", "-c, --create <name>", "-r, --restore <id>", "-d, --delete <id>", "--download <id>", "-o, --output <file>", "--count"] },
      settings: { description: "Configuration management", subcommands: ["wizard", "init", "validate", "set", "get", "path", "reset", "list"] },
    },
    query_syntax: {
      domain: "Filter by domain (e.g., domain:light)",
      state: "Filter by state (e.g., state:on)",
      name: "Filter by name pattern (e.g., name:living)",
      attributes: "Filter by attribute (e.g., attributes:unit_of_measurement=C)",
    },
    output_formats: {
      toon: "Token-efficient format (default, ~40% smaller than JSON)",
      json: "Pretty-printed JSON",
      "json-compact": "Minified JSON",
      yaml: "YAML format",
      table: "ASCII table",
    },
  };
}

export function createActionCommand(): Command {
  const command = new Command("action")
    .description("Intelligent action helper for LLMs")
    .argument("<intent>", "Natural language intent (e.g., 'turn on living room lights')")
    .option("--dry-run", "Show what would be done without executing");

  command.action(async (intent: string, options: { dryRun?: boolean }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();

    const intentLower = intent.toLowerCase();
    const suggestions: Array<{ type: string; entity?: string; service?: string; domain?: string | undefined; confidence: number }> = [];

    const turnOnMatch = intentLower.match(/turn on|switch on|enable|activate/i);
    const turnOffMatch = intentLower.match(/turn off|switch off|disable|deactivate/i);
    const toggleMatch = intentLower.match(/toggle/i);

    if (turnOnMatch || turnOffMatch || toggleMatch) {
      const action = turnOnMatch ? "turn_on" : turnOffMatch ? "turn_off" : "toggle";
      const relevantDomains = ["light", "switch", "fan", "humidifier", "media_player", "cover"];

      for (const state of states) {
        const domain = state.entity_id.split(".")[0];
        if (!relevantDomains.includes(domain || "")) continue;

        const friendlyName = (state.attributes["friendly_name"] as string || state.entity_id).toLowerCase();
        const entityIdLower = state.entity_id.toLowerCase();

        for (const keyword of intentLower.split(/\s+/)) {
          if (keyword.length < 3) continue;
          if (friendlyName.includes(keyword) || entityIdLower.includes(keyword)) {
            suggestions.push({
              type: "service_call",
              entity: state.entity_id,
              service: `${domain}.${action}`,
              domain: domain || undefined,
              confidence: keyword.length > 5 ? 0.9 : 0.7,
            });
          }
        }
      }
    }

    const uniqueSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .filter((s, i, arr) => arr.findIndex(x => x.entity === s.entity) === i);

    if (options.dryRun) {
      console.log(formatOutput({
        intent,
        suggestions: uniqueSuggestions,
        dry_run: true,
        message: "Dry run mode - no actions executed",
      }, format));
      return;
    }

    console.log(formatOutput({
      intent,
      suggestions: uniqueSuggestions,
      hint: "Use 'call-service' command with suggested service and entity",
    }, format));
  });

  return command;
}
