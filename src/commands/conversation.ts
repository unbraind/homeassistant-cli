import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { ConversationApiClient } from "../api/conversation.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new ConversationApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createConversationCommand(): Command {
  const command = new Command("conversation")
    .description("Interact with Home Assistant conversation/voice assistants")
    .option("--agents", "List available conversation agents")
    .option("--text <text>", "Process text through conversation")
    .option("-a, --agent-id <agentId>", "Agent ID to use")
    .option("--conversation-id <id>", "Conversation ID for context");

  command.action(withExit(async (options: {
    agents?: boolean;
    text?: string;
    agentId?: string;
    conversationId?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.agents) {
      try {
        const agents = await client.getConversationAgents();
        console.log(formatOutput({ conversation_agents: agents }, format));
      } catch {
        console.log(formatOutput({ conversation_agents: [], message: "No conversation agents available" }, format));
      }
      return;
    }

    if (options.text) {
      const convOptions: { agentId?: string; conversationId?: string } = {};
      if (options.agentId) convOptions.agentId = options.agentId;
      if (options.conversationId) convOptions.conversationId = options.conversationId;
      const result = await client.processConversation(options.text, convOptions);
      console.log(formatOutput({
        response: result.response.speech.plain.speech,
        conversation_id: result.conversation_id,
        response_type: result.response.response_type,
        data: result.response.data,
      }, format));
      return;
    }

    command.help();
  }));

  return command;
}

export function createAskCommand(): Command {
  const command = new Command("ask")
    .description("Ask Home Assistant a question (shortcut for conversation)")
    .argument("<text>", "Question or command to process")
    .option("-a, --agent-id <agentId>", "Agent ID to use");

  command.action(withExit(async (text: string, options: { agentId?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const convOptions: { agentId?: string } = {};
    if (options.agentId) convOptions.agentId = options.agentId;
    const result = await client.processConversation(text, convOptions);
    
    console.log(formatOutput({
      response: result.response.speech.plain.speech,
      conversation_id: result.conversation_id,
    }, format));
  }));

  return command;
}
