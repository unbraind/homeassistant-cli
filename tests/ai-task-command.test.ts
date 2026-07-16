import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAiTaskCommand } from "../src/commands/ai-task.js";

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

const aiTaskStates = [
  {
    entity_id: "ai_task.openai_ai_task",
    state: "unknown",
    attributes: {
      friendly_name: "OpenAI AI Task",
      supported_features: 7,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.unrelated",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

describe("ai-task command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all AI task entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(aiTaskStates));
    const cmd = createAiTaskCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("ai_task.openai_ai_task");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(aiTaskStates));
    const cmd = createAiTaskCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.ai_tasks_count).toBe(1);
  });

  it("generates data with --generate-data and --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ data: { result: "test data" } }));
    const cmd = createAiTaskCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([
        "--entity-id", "ai_task.openai_ai_task",
        "--generate-data", "List 3 home automation ideas",
      ], { from: "user" })
    );
    expect(result).toContain("generate_data");
    expect(result).toContain("ai_task.openai_ai_task");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.entity_id).toBe("ai_task.openai_ai_task");
    expect(body.instructions).toBe("List 3 home automation ideas");
    expect(body.task_name).toBe("cli_task");
  });

  it("generates data with --structure option", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ data: {} }));
    const cmd = createAiTaskCommand();
    const structure = JSON.stringify({ type: "object", properties: { name: { type: "string" } } });
    const result = await captureLog(() =>
      cmd.parseAsync([
        "--entity-id", "ai_task.openai_ai_task",
        "--generate-data", "Get device name",
        "--structure", structure,
      ], { from: "user" })
    );
    expect(result).toContain("generate_data");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.structure).toBeDefined();
  });

  it("exits with error when --generate-data used without --entity-id", async () => {
    const cmd = createAiTaskCommand();
    await captureLog(() =>
      cmd.parseAsync(["--generate-data", "test prompt"], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("generates image with --generate-image and --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ data: { url: "http://example.com/image.png" } }));
    const cmd = createAiTaskCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([
        "--entity-id", "ai_task.openai_ai_task",
        "--generate-image", "A smart home dashboard",
      ], { from: "user" })
    );
    expect(result).toContain("generate_image");
    expect(result).toContain("ai_task.openai_ai_task");
  });

  it("exits with error when --generate-image used without --entity-id", async () => {
    const cmd = createAiTaskCommand();
    await captureLog(() =>
      cmd.parseAsync(["--generate-image", "test prompt"], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error when --structure is invalid JSON", async () => {
    const cmd = createAiTaskCommand();
    await captureLog(() =>
      cmd.parseAsync([
        "--entity-id", "ai_task.openai_ai_task",
        "--generate-data", "test",
        "--structure", "not-json",
      ], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(aiTaskStates));
    const cmd = createAiTaskCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "unknown"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.ai_tasks).toHaveLength(1);
  });
});
