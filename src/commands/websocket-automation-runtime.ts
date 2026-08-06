/**
 * Defines typed Home Assistant condition evaluation and action-sequence runtime commands.
 */
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type Definition = Record<string, unknown> | Record<string, unknown>[];

type SourceOptions = {
  condition?: string;
  sequence?: string;
  file?: string;
  variables?: string;
  waitMs: string;
  maxEvents: string;
};

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseVariables(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Variables must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function validateDefinition(value: unknown, label: string, allowArray: boolean): Definition {
  if (!value || typeof value !== "object" || (!allowArray && Array.isArray(value))) {
    throw new Error(`${label} must be a JSON ${allowArray ? "object or array of objects" : "object"}`);
  }
  if (Array.isArray(value)) {
    if (value.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry))) {
      throw new Error(`${label} must be a JSON object or array of objects`);
    }
    return value as Record<string, unknown>[];
  }
  return value as Record<string, unknown>;
}

async function readDefinition(options: {
  inline: string | undefined;
  file: string | undefined;
  label: string;
  wrapperKeys: string[];
  allowArray: boolean;
}): Promise<Definition> {
  if (options.inline) {
    return validateDefinition(JSON.parse(options.inline) as unknown, options.label, options.allowArray);
  }
  if (!options.file) {
    throw new Error(`Provide --${options.label.toLowerCase()} or --file`);
  }
  const parsed = JSON.parse(await readFile(options.file, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return validateDefinition(parsed, options.label, options.allowArray);
  }
  const fileObject = parsed as Record<string, unknown>;
  const wrapped = options.wrapperKeys
    .map((key) => fileObject[key])
    .find((value) => Boolean(value) && typeof value === "object");
  return validateDefinition(wrapped ?? parsed, options.label, options.allowArray);
}

function createTestConditionCommand(): Command {
  const command = new Command("test-condition")
    .description("Evaluate one condition immediately without executing actions (admin only)")
    .option("--condition <json>", "Condition object as inline JSON")
    .option("--file <path>", "Condition or automation JSON file; --condition takes precedence")
    .option("--variables <json>", "Optional condition variables as a JSON object");

  command.action(withExit(async (options: SourceOptions, cmd) => {
    const condition = await readDefinition({
      inline: options.condition,
      file: options.file,
      label: "Condition",
      wrapperKeys: ["conditions", "condition"],
      allowArray: false,
    }) as Record<string, unknown>;
    const payload: Record<string, unknown> = { condition };
    const variables = parseVariables(options.variables);
    if (variables) payload["variables"] = variables;
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      console.log(formatOutput({
        evaluation: "condition",
        result: await client.call("test_condition", payload),
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

function createObserveConditionCommand(): Command {
  const command = new Command("observe-condition")
    .description("Collect changed condition evaluations for a bounded period (admin only)")
    .option("--condition <json>", "Condition object as inline JSON")
    .option("--file <path>", "Condition or automation JSON file; --condition takes precedence")
    .option("--wait-ms <ms>", "How long to observe the condition", "5000")
    .option("--max-events <n>", "Maximum changed evaluations to return", "10");

  command.action(withExit(async (options: SourceOptions, cmd) => {
    const condition = await readDefinition({
      inline: options.condition,
      file: options.file,
      label: "Condition",
      wrapperKeys: ["conditions", "condition"],
      allowArray: false,
    }) as Record<string, unknown>;
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      const events = await client.subscribeCondition({
        condition,
        waitMs: parsePositiveInteger(options.waitMs, "--wait-ms"),
        maxEvents: parsePositiveInteger(options.maxEvents, "--max-events"),
      });
      console.log(formatOutput({
        subscription: "condition",
        event_count: events.length,
        events,
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

function createExecuteSequenceCommand(): Command {
  const command = new Command("execute-sequence")
    .description("Execute an ad hoc action sequence (admin only; blocked in read-only mode)")
    .option("--sequence <json>", "Action object or sequence array as inline JSON")
    .option("--file <path>", "Sequence or automation JSON file; --sequence takes precedence")
    .option("--variables <json>", "Optional sequence variables as a JSON object");

  command.action(withExit(async (options: SourceOptions, cmd) => {
    const sequence = await readDefinition({
      inline: options.sequence,
      file: options.file,
      label: "Sequence",
      wrapperKeys: ["sequence", "actions", "action"],
      allowArray: true,
    });
    const variables = parseVariables(options.variables);
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      console.log(formatOutput({
        execution: "sequence",
        result: await client.executeScript({ sequence, ...(variables ? { variables } : {}) }),
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

/** Build typed condition evaluation, observation, and sequence execution commands. */
export function createWebsocketAutomationRuntimeCommand(): Command {
  return new Command("automation-runtime")
    .description("Evaluate conditions and safely execute ad hoc action sequences")
    .addHelpText("after", `
Examples:
  hassio ws automation-runtime test-condition --condition '{"condition":"state","entity_id":"sun.sun","state":"above_horizon"}'
  hassio ws automation-runtime observe-condition --file automation.json --wait-ms 10000
  hassio ws automation-runtime execute-sequence --file automation.json --variables '{"source":"agent"}'

Condition operations do not execute actions. Sequence execution can change Home
Assistant state and is rejected before connecting when read-only mode is enabled.
`)
    .addCommand(createTestConditionCommand())
    .addCommand(createObserveConditionCommand())
    .addCommand(createExecuteSequenceCommand());
}
