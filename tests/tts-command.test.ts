import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTtsCommand, createSayCommand } from "../src/commands/tts.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

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

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

const engines = [
  { engine_id: "tts.google_translate", name: "Google Translate", supported_languages: ["en", "de"] },
  { engine_id: "tts.cloud", name: "Cloud TTS", supported_languages: ["en"] },
];

describe("tts command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists TTS engines with --engines flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(engines));

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--engines"], { from: "user" })
    );

    expect(result).toContain("tts_engines");
    expect(result).toContain("tts.google_translate");
  });

  it("lists TTS engines with --list-engines alias", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(engines));

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--list-engines"], { from: "user" })
    );

    expect(result).toContain("tts_engines");
  });

  it("falls back gracefully when engines unavailable", async () => {
    mockRequest.mockRejectedValueOnce(new Error("503 Unavailable"));

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--engines"], { from: "user" })
    );

    expect(result).toContain("tts_engines");
  });

  it("clears TTS cache with --clear-cache", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--clear-cache"], { from: "user" })
    );

    expect(result).toContain("success");
    expect(result).toContain("cleared");
  });

  it("gets TTS URL with --message and --engine", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse({ url: "http://localhost:8123/tts/abc.mp3", path: "/tts/abc.mp3" })
    );

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--message", "Hello world", "--engine", "tts.google_translate"], { from: "user" })
    );

    expect(result).toContain("url");
  });

  it("speaks through player with --message and --player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "--message", "Hello", "--player", "media_player.living_room"],
        { from: "user" }
      )
    );

    expect(result).toContain("success");
    expect(result).toContain("media_player.living_room");
  });

  it("speaks with engine and language options", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTtsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "--message", "Hallo", "--player", "media_player.living_room", "--engine", "tts.cloud", "--language", "de"],
        { from: "user" }
      )
    );

    // Should succeed and report the player entity
    expect(result).toContain("media_player.living_room");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe("say command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("speaks a message through a player", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createSayCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "Good morning", "--player", "media_player.kitchen"],
        { from: "user" }
      )
    );

    expect(result).toContain("success");
    expect(result).toContain("media_player.kitchen");
  });

  it("passes engine to say command", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createSayCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "Hello", "--player", "media_player.kitchen", "--engine", "tts.cloud"],
        { from: "user" }
      )
    );

    // Should succeed even with engine option
    expect(result).toContain("media_player.kitchen");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
