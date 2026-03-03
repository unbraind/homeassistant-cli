import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPipelineCommand } from "../src/commands/pipeline.js";

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

const mockCall = vi.fn();
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(() => ({
    call: mockCall,
    close: mockClose,
  })),
}));

const pipelineList = {
  preferred_pipeline: "pipeline-001",
  pipelines: [
    {
      id: "pipeline-001",
      name: "Home Assistant",
      language: "en",
      conversation_engine: "conversation.home_assistant",
      conversation_language: "en",
      stt_engine: null,
      stt_language: null,
      tts_engine: "tts.home_assistant_cloud",
      tts_language: "en-US",
      tts_voice: "JennyNeural",
      wake_word_entity: null,
      wake_word_id: null,
      prefer_local_intents: false,
    },
  ],
};

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

describe("pipeline command", () => {
  beforeEach(() => {
    exitSpy.mockClear();
    mockCall.mockReset();
    mockClose.mockReset();
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists pipelines", async () => {
    mockCall.mockResolvedValueOnce(pipelineList);
    const cmd = createPipelineCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["list"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.preferred_pipeline).toBe("pipeline-001");
    expect(parsed.pipelines).toHaveLength(1);
    expect(parsed.pipelines[0].name).toBe("Home Assistant");
  });

  it("lists pipelines with --count", async () => {
    mockCall.mockResolvedValueOnce(pipelineList);
    const cmd = createPipelineCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["list", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.pipeline_count).toBe(1);
  });

  it("gets a specific pipeline", async () => {
    const pipeline = { id: "pipeline-001", name: "Home Assistant", language: "en" };
    mockCall.mockResolvedValueOnce(pipeline);
    const cmd = createPipelineCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["get", "pipeline-001"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe("pipeline-001");
    expect(parsed.name).toBe("Home Assistant");
  });

  it("creates a pipeline", async () => {
    const created = { id: "pipeline-new", name: "My Pipeline", language: "en" };
    mockCall.mockResolvedValueOnce(created);
    const cmd = createPipelineCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["create", "--name", "My Pipeline", "--language", "en"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.created).toBe(true);
    expect(parsed.pipeline.name).toBe("My Pipeline");
  });

  it("deletes a pipeline", async () => {
    mockCall.mockResolvedValueOnce(null);
    const cmd = createPipelineCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["delete", "pipeline-001"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.deleted).toBe(true);
    expect(parsed.pipeline_id).toBe("pipeline-001");
  });

  it("sets preferred pipeline", async () => {
    mockCall.mockResolvedValueOnce(null);
    const cmd = createPipelineCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["set-preferred", "pipeline-001"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.updated).toBe(true);
    expect(parsed.preferred_pipeline_id).toBe("pipeline-001");
  });
});
