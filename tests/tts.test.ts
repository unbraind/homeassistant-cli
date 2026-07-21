import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtsApiClient } from "../src/api/tts.js";

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

describe("TtsApiClient", () => {
  let client: TtsApiClient;

  beforeEach(() => {
    client = new TtsApiClient({
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

  describe("getTtsEngines", () => {
    it("should return TTS engines", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ engine_id: "tts.cloud", name: "Cloud TTS", supported_languages: ["en"] }])
      );
      const result = await client.getTtsEngines();
      expect(result).toHaveLength(1);
      expect(result[0]?.engine_id).toBe("tts.cloud");
    });
  });

  describe("getTtsUrl", () => {
    it("should get TTS URL", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ url: "http://localhost:8123/tts/test.mp3", path: "/tts/test.mp3" })
      );
      const result = await client.getTtsUrl("tts.cloud", "Hello world");
      expect(result).toBe("http://localhost:8123/tts/test.mp3");
    });

    it("passes language and engine options", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ url: "http://ha/voice.mp3", path: "/voice.mp3" }));
      await client.getTtsUrl("tts.cloud", "Hello", { language: "en", options: { voice: "Jenny" } });
      expect(mockRequest.mock.calls[0]?.[1]?.body).toContain('"language":"en"');
      expect(mockRequest.mock.calls[0]?.[1]?.body).toContain('"voice":"Jenny"');
    });
  });

  describe("speak", () => {
    it("should call tts.speak service", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ context: { id: "123" } })
      );
      await client.speak("media_player.living_room", "Hello");
      const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
      const callBody = callOptions?.body ? JSON.parse(callOptions.body) : {};
      expect(callBody.entity_id).toBe("media_player.living_room");
      expect(callBody.message).toBe("Hello");
    });

    it("preserves an explicit false cache option", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.speak("media_player.living_room", "Hello", { cache: false });
      expect(mockRequest.mock.calls[0]?.[1]?.body).toContain('"cache":false');
    });
  });

  describe("clearTtsCache", () => {
    it("should call tts.clear_cache service", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ context: { id: "123" } })
      );
      await client.clearTtsCache();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/tts/clear_cache"),
        expect.any(Object)
      );
    });
  });
});
