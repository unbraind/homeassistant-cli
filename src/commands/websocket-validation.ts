/**
 * Defines typed Home Assistant automation validation over WebSocket.
 */
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type AutomationDefinition = Record<string, unknown> | unknown[];

interface AutomationConfigFile {
  trigger?: AutomationDefinition;
  triggers?: AutomationDefinition;
  condition?: AutomationDefinition;
  conditions?: AutomationDefinition;
  action?: AutomationDefinition;
  actions?: AutomationDefinition;
}

function validateDefinition(value: unknown, label: string): AutomationDefinition {
  if (value === null || typeof value !== "object") {
    throw new Error(`${label} must be a JSON object or array`);
  }
  return value as AutomationDefinition;
}

function parseDefinition(value: string, label: string): AutomationDefinition {
  return validateDefinition(JSON.parse(value) as unknown, label);
}

function definitionFromFile(
  file: AutomationConfigFile,
  singular: keyof Pick<AutomationConfigFile, "trigger" | "condition" | "action">,
  plural: keyof Pick<AutomationConfigFile, "triggers" | "conditions" | "actions">,
  label: string,
): AutomationDefinition | undefined {
  const definition = file[singular] ?? file[plural];
  return definition === undefined ? undefined : validateDefinition(definition, label);
}

/** Build the typed automation configuration validation command. */
export function createWebsocketValidationCommand(): Command {
  const command = new Command("validate-config")
    .description("Validate automation triggers, conditions, and actions without executing them")
    .option("--trigger <json>", "Trigger object or array as JSON")
    .option("--condition <json>", "Condition object or array as JSON")
    .option("--action <json>", "Action object or array as JSON")
    .option("--file <path>", "JSON automation file; CLI definitions override matching file fields")
    .addHelpText("after", `
Examples:
  hassio ws validate-config --trigger '{"trigger":"state","entity_id":"binary_sensor.door"}'
  hassio ws validate-config --action '[{"action":"light.turn_on","target":{"entity_id":"light.kitchen"}}]'
  hassio ws validate-config --file automation.json
`);

  command.action(withExit(async (options: {
    trigger?: string;
    condition?: string;
    action?: string;
    file?: string;
  }, cmd) => {
    let file: AutomationConfigFile = {};
    if (options.file) {
      const parsed = JSON.parse(await readFile(options.file, "utf8")) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Automation file must contain a JSON object");
      }
      file = parsed as AutomationConfigFile;
    }

    const triggers = options.trigger
      ? parseDefinition(options.trigger, "Trigger")
      : definitionFromFile(file, "trigger", "triggers", "Trigger");
    const conditions = options.condition
      ? parseDefinition(options.condition, "Condition")
      : definitionFromFile(file, "condition", "conditions", "Condition");
    const actions = options.action
      ? parseDefinition(options.action, "Action")
      : definitionFromFile(file, "action", "actions", "Action");
    const payload: Record<string, unknown> = {};
    if (triggers !== undefined) payload["triggers"] = triggers;
    if (conditions !== undefined) payload["conditions"] = conditions;
    if (actions !== undefined) payload["actions"] = actions;
    if (Object.keys(payload).length === 0) {
      throw new Error("Provide at least one trigger, condition, or action definition");
    }

    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      console.log(formatOutput(await client.call("validate_config", payload), format));
    } finally {
      await client.close();
    }
  }));

  return command;
}
