import type { Config } from "../types/options.js";
import { HomeAssistantClient } from "./client.js";

export interface HaConversationAgent {
  agent_id: string;
  name: string;
  supported_languages: string[] | null;
}

export interface HaConversationResponse {
  response: {
    speech: {
      plain: {
        speech: string;
        extra_data: unknown | null;
      };
    };
    response_type: string | null;
    data: Record<string, unknown> | null;
  };
  conversation_id: string | null;
}

export class ConversationApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getConversationAgents(): Promise<HaConversationAgent[]> {
    return this.request<HaConversationAgent[]>("GET", "/conversation/agents");
  }

  async processConversation(
    text: string,
    options?: {
      agentId?: string;
      conversationId?: string;
      language?: string;
    }
  ): Promise<HaConversationResponse> {
    const body: Record<string, unknown> = { text };
    if (options?.agentId) body["agent_id"] = options.agentId;
    if (options?.conversationId) body["conversation_id"] = options.conversationId;
    if (options?.language) body["language"] = options.language;
    return this.request<HaConversationResponse>("POST", "/conversation/process", body);
  }

  async getVoiceAssistants(): Promise<HaVoiceAssistant[]> {
    return this.request<HaVoiceAssistant[]>("GET", "/voice_assistant/assistants");
  }

  async triggerVoiceAssistant(
    assistantId: string,
    text: string,
    options?: { conversationId?: string }
  ): Promise<HaConversationResponse> {
    const body: Record<string, unknown> = { 
      start_stage: "intent",
      end_stage: "response",
      input: { text },
    };
    if (options?.conversationId) body["conversation_id"] = options.conversationId;
    return this.request<HaConversationResponse>(
      "POST",
      `/voice_assistant/assistants/${assistantId}/trigger`,
      body
    );
  }
}

export interface HaVoiceAssistant {
  id: string;
  name: string;
  language: string;
}
