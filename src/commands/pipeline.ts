/**
 * Defines the pipeline command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

interface AssistPipeline {
  id: string;
  name: string;
  language: string;
  conversation_engine: string;
  conversation_language: string;
  stt_engine: string | null;
  stt_language: string | null;
  tts_engine: string | null;
  tts_language: string | null;
  tts_voice: string | null;
  wake_word_entity: string | null;
  wake_word_id: string | null;
  prefer_local_intents: boolean;
}

interface PipelineListResult {
  pipelines: AssistPipeline[];
  preferred_pipeline: string;
}

export function createPipelineCommand(): Command {
  const cmd = new Command("pipeline")
    .description("Manage Home Assistant Assist voice pipelines");

  cmd.addCommand(createPipelineListCommand());
  cmd.addCommand(createPipelineGetCommand());
  cmd.addCommand(createPipelineCreateCommand());
  cmd.addCommand(createPipelineDeleteCommand());
  cmd.addCommand(createPipelineSetPreferredCommand());

  return cmd;
}

function createPipelineListCommand(): Command {
  const cmd = new Command("list")
    .description("List all assist pipelines")
    .option("--count", "Return count only");

  cmd.action(withExit(async (options: { count?: boolean }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      const result = await client.call("assist_pipeline/pipeline/list") as PipelineListResult;
      const pipelines = result.pipelines ?? [];
      if (options.count) {
        console.log(formatOutput({ pipeline_count: pipelines.length }, format));
        return;
      }
      console.log(formatOutput({
        preferred_pipeline: result.preferred_pipeline,
        pipelines: pipelines.map(p => ({
          id: p.id,
          name: p.name,
          language: p.language,
          conversation_engine: p.conversation_engine,
          stt_engine: p.stt_engine,
          tts_engine: p.tts_engine,
          tts_voice: p.tts_voice,
          wake_word_entity: p.wake_word_entity,
        })),
      }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}

function createPipelineGetCommand(): Command {
  const cmd = new Command("get")
    .description("Get details of a specific pipeline")
    .argument("<id>", "Pipeline ID");

  cmd.action(withExit(async (id: string, _options, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      const result = await client.call("assist_pipeline/pipeline/get", { pipeline_id: id }) as AssistPipeline;
      console.log(formatOutput(result, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}

function createPipelineCreateCommand(): Command {
  const cmd = new Command("create")
    .description("Create a new assist pipeline")
    .requiredOption("--name <name>", "Pipeline name")
    .option("--language <lang>", "Language code (e.g., en)", "en")
    .option("--conversation-engine <engine>", "Conversation engine ID")
    .option("--stt-engine <engine>", "Speech-to-text engine ID")
    .option("--tts-engine <engine>", "Text-to-speech engine ID");

  cmd.action(withExit(async (options: {
    name: string;
    language: string;
    conversationEngine?: string;
    sttEngine?: string;
    ttsEngine?: string;
  }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    const payload: Record<string, unknown> = {
      name: options.name,
      language: options.language,
    };
    if (options.conversationEngine) payload["conversation_engine"] = options.conversationEngine;
    if (options.sttEngine) payload["stt_engine"] = options.sttEngine;
    if (options.ttsEngine) payload["tts_engine"] = options.ttsEngine;

    try {
      const result = await client.call("assist_pipeline/pipeline/create", payload) as AssistPipeline;
      console.log(formatOutput({ created: true, pipeline: result }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}

function createPipelineDeleteCommand(): Command {
  const cmd = new Command("delete")
    .description("Delete an assist pipeline")
    .argument("<id>", "Pipeline ID to delete");

  cmd.action(withExit(async (id: string, _options, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      await client.call("assist_pipeline/pipeline/delete", { pipeline_id: id });
      console.log(formatOutput({ deleted: true, pipeline_id: id }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}

function createPipelineSetPreferredCommand(): Command {
  const cmd = new Command("set-preferred")
    .description("Set the preferred assist pipeline")
    .argument("<id>", "Pipeline ID to set as preferred");

  cmd.action(withExit(async (id: string, _options, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      await client.call("assist_pipeline/pipeline/set_preferred", { pipeline_id: id });
      console.log(formatOutput({ preferred_pipeline_id: id, updated: true }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}
