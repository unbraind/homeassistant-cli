/**
 * Defines the ai task command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createAiTaskCommand(): Command {
  const command = new Command("ai-task")
    .description("Interact with Home Assistant AI Task entities (generate data, images)")
    .option("-e, --entity-id <entityId>", "Target AI task entity (e.g. ai_task.openai_ai_task)")
    .option("--generate-data <instructions>", "Generate structured data using AI (use with --entity-id)")
    .option("--generate-image <instructions>", "Generate an image using AI (use with --entity-id)")
    .option("--task-name <name>", "Task name identifier (required for generate operations, default: 'cli_task')")
    .option("--structure <json>", "JSON schema structure for generate-data output")
    .option("--count", "Only return count of AI task entities")
    .option("-s, --state <state>", "Filter by state");

  command.action(withExit(async (options: {
    entityId?: string;
    generateData?: string;
    generateImage?: string;
    taskName?: string;
    structure?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.generateData) {
      const entityId = options.entityId;
      if (!entityId) {
        console.error("Error: --entity-id required when using --generate-data");
        process.exit(1);
        return;
      }
      const payload: Record<string, unknown> = {
        entity_id: entityId,
        task_name: options.taskName ?? "cli_task",
        instructions: options.generateData,
      };
      if (options.structure) {
        try {
          payload["structure"] = JSON.parse(options.structure);
        } catch {
          console.error("Error: --structure must be valid JSON");
          process.exit(1);
          return;
        }
      }
      const result = await client.callService("ai_task", "generate_data", payload, true);
      console.log(formatOutput({ success: true, action: "generate_data", entity_id: entityId, result }, format));
      return;
    }

    if (options.generateImage) {
      const entityId = options.entityId;
      if (!entityId) {
        console.error("Error: --entity-id required when using --generate-image");
        process.exit(1);
        return;
      }
      const payload: Record<string, unknown> = {
        entity_id: entityId,
        task_name: options.taskName ?? "cli_task",
        instructions: options.generateImage,
      };
      const result = await client.callService("ai_task", "generate_image", payload, true);
      console.log(formatOutput({ success: true, action: "generate_image", entity_id: entityId, result }, format));
      return;
    }

    // List AI task entities
    const states = await client.getStates();
    let tasks = states.filter(s => s.entity_id.startsWith("ai_task."));
    if (options.state) tasks = tasks.filter(t => t.state === options.state);

    const simplified = tasks.map(t => ({
      entity_id: t.entity_id,
      state: t.state,
      friendly_name: t.attributes["friendly_name"],
      supported_features: t.attributes["supported_features"],
    }));

    if (options.count) {
      console.log(formatOutput({ ai_tasks_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ ai_tasks: simplified }, format));
  }));

  return command;
}
