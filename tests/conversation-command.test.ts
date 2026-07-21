import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createConversationCommand, createAskCommand } from "../src/commands/conversation.js";

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

const conversationResponse = {
  response: {
    speech: { plain: { speech: "It is 10 PM", extra_data: null } },
    response_type: "action_done",
    data: null,
  },
  conversation_id: "conv-abc123",
};

const agentsResponse = [
  { agent_id: "homeassistant", name: "Home Assistant", supported_languages: null },
  { agent_id: "openai", name: "OpenAI", supported_languages: ["en"] },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

describe("conversation command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists conversation agents with --agents flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(agentsResponse));

    const cmd = createConversationCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--agents"], { from: "user" })
    );

    expect(result).toContain("homeassistant");
    expect(result).toContain("openai");
    expect(result).toContain("conversation_agents");
  });

  it("falls back gracefully when agents unavailable", async () => {
    mockRequest.mockRejectedValueOnce(new Error("503 Unavailable"));

    const cmd = createConversationCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--agents"], { from: "user" })
    );

    expect(result).toContain("conversation_agents");
  });

  it("processes text conversation with --text flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(conversationResponse));

    const cmd = createConversationCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--text", "what time is it"], { from: "user" })
    );

    expect(result).toContain("It is 10 PM");
    expect(result).toContain("conv-abc123");
  });

  it("passes agent-id to conversation API", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(conversationResponse));

    const cmd = createConversationCommand();
    await captureLog(() =>
      cmd.parseAsync(["--text", "hello", "--agent-id", "openai"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.agent_id).toBe("openai");
  });

  it("passes conversation-id for context continuity", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(conversationResponse));

    const cmd = createConversationCommand();
    await captureLog(() =>
      cmd.parseAsync(["--text", "follow up", "--conversation-id", "prev-conv"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.conversation_id).toBe("prev-conv");
  });

  it("shows command help when no operation is supplied", async () => {
    const helpSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await createConversationCommand().parseAsync([], { from: "user" });
    expect(exitSpy).toHaveBeenCalled();
    helpSpy.mockRestore();
  });
});

describe("ask command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends a question to the voice assistant", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(conversationResponse));

    const cmd = createAskCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["what time is it"], { from: "user" })
    );

    expect(result).toContain("It is 10 PM");
    expect(result).toContain("conv-abc123");
  });

  it("passes agent-id to ask command", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(conversationResponse));

    const cmd = createAskCommand();
    await captureLog(() =>
      cmd.parseAsync(["hello", "--agent-id", "openai"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.agent_id).toBe("openai");
  });
});
