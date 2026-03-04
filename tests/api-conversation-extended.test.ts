import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConversationApiClient } from "../src/api/conversation.js";

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

describe("ConversationApiClient extended", () => {
  let client: ConversationApiClient;

  beforeEach(() => {
    client = new ConversationApiClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConversationAgents", () => {
    it("returns list of conversation agents", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { agent_id: "homeassistant", name: "Home Assistant", supported_languages: ["en", "de"] },
        ])
      );
      const result = await client.getConversationAgents();
      expect(result).toHaveLength(1);
      expect(result[0]?.agent_id).toBe("homeassistant");
    });
  });

  describe("processConversation", () => {
    it("processes conversation with text only", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          response: {
            speech: { plain: { speech: "Done!", extra_data: null } },
            response_type: "action_done",
            data: {},
          },
          conversation_id: "conv-123",
        })
      );
      const result = await client.processConversation("Turn on the lights");
      expect(result.conversation_id).toBe("conv-123");
      expect(result.response.speech.plain.speech).toBe("Done!");
    });

    it("processes conversation with options", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          response: {
            speech: { plain: { speech: "Done!", extra_data: null } },
            response_type: "action_done",
            data: {},
          },
          conversation_id: "conv-456",
        })
      );
      const result = await client.processConversation("Turn off fan", {
        agentId: "homeassistant",
        conversationId: "existing-conv",
        language: "en",
      });
      expect(result.conversation_id).toBe("conv-456");

      // Verify the body was sent with all options
      const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
      const body = JSON.parse(callOptions?.body ?? "{}");
      expect(body.agent_id).toBe("homeassistant");
      expect(body.conversation_id).toBe("existing-conv");
      expect(body.language).toBe("en");
    });
  });

  describe("getVoiceAssistants", () => {
    it("returns list of voice assistants", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { id: "assist1", name: "Assist", language: "en" },
          { id: "assist2", name: "German Assist", language: "de" },
        ])
      );
      const result = await client.getVoiceAssistants();
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Assist");
    });
  });

  describe("triggerVoiceAssistant", () => {
    it("triggers a voice assistant", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          response: {
            speech: { plain: { speech: "Light turned on!", extra_data: null } },
            response_type: "action_done",
            data: {},
          },
          conversation_id: "voice-conv-123",
        })
      );
      const result = await client.triggerVoiceAssistant("assist1", "Turn on lights");
      expect(result.conversation_id).toBe("voice-conv-123");

      // Verify the URL and request structure
      const url = mockRequest.mock.calls[0]?.[0] as string;
      expect(url).toContain("/voice_assistant/assistants/assist1/trigger");

      const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
      const body = JSON.parse(callOptions?.body ?? "{}");
      expect(body.start_stage).toBe("intent");
      expect(body.end_stage).toBe("response");
      expect(body.input.text).toBe("Turn on lights");
    });

    it("triggers voice assistant with conversation id", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          response: {
            speech: { plain: { speech: "Done!", extra_data: null } },
            response_type: "action_done",
            data: {},
          },
          conversation_id: "voice-conv-existing",
        })
      );
      await client.triggerVoiceAssistant("assist1", "Turn off lights", {
        conversationId: "existing-conv",
      });

      const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
      const body = JSON.parse(callOptions?.body ?? "{}");
      expect(body.conversation_id).toBe("existing-conv");
    });
  });
});
