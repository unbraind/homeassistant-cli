import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConversationApiClient } from "../src/api/conversation.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

describe("ConversationApiClient", () => {
  let client: ConversationApiClient;

  beforeEach(() => {
    client = new ConversationApiClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConversationAgents", () => {
    it("should return conversation agents", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ agent_id: "homeassistant", name: "Home Assistant", supported_languages: null }])
      );
      const result = await client.getConversationAgents();
      expect(result).toHaveLength(1);
      expect(result[0]?.agent_id).toBe("homeassistant");
    });
  });

  describe("processConversation", () => {
    it("should process conversation text", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          response: {
            speech: { plain: { speech: "It is 8 PM", extra_data: null } },
            response_type: "action_done",
            data: null,
          },
          conversation_id: "test-123",
        })
      );
      const result = await client.processConversation("what time is it");
      expect(result.response.speech.plain.speech).toBe("It is 8 PM");
      expect(result.conversation_id).toBe("test-123");
    });

    it("should pass agent ID", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          response: { speech: { plain: { speech: "OK", extra_data: null } }, response_type: null, data: null },
          conversation_id: null,
        })
      );
      await client.processConversation("test", { agentId: "custom-agent" });
      const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
      const callBody = callOptions?.body ? JSON.parse(callOptions.body) : {};
      expect(callBody.agent_id).toBe("custom-agent");
    });
  });
});
