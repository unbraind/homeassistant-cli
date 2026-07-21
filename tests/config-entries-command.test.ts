import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createConfigEntriesCommand } from "../src/commands/config-entries.js";

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

describe("config-entries command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns filtered count summary", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { entry_id: "1", domain: "mqtt", title: "MQTT", source: "user", state: "loaded" },
        { entry_id: "2", domain: "mqtt", title: "MQTT 2", source: "import", state: "loaded" },
        { entry_id: "3", domain: "hue", title: "Hue", source: "user", state: "setup_error" },
      ])
    );

    const cmd = createConfigEntriesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["--domain", "mqtt", "--count"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["count"]).toBe(2);
    expect(parsed["by_domain"]).toEqual([{ domain: "mqtt", count: 2 }]);
  });

  it("requires --yes for deletion", async () => {
    const cmd = createConfigEntriesCommand();
    await expect(cmd.parseAsync(["--delete", "entry-1"], { from: "user" })).rejects.toThrow(
      "Deletion requires --yes to confirm"
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("deletes when --yes is provided", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({}));

    const cmd = createConfigEntriesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["--delete", "entry-1", "--yes"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["deleted"]).toBe(true);
    expect(parsed["entry_id"]).toBe("entry-1");
  });

  it("lists entries filtered by state and source in stable domain/title order", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      { entry_id: "3", domain: "mqtt", title: "Zulu", source: "user", state: "loaded" },
      { entry_id: "1", domain: "hue", title: "Hue", source: "user", state: "loaded" },
      { entry_id: "2", domain: "mqtt", title: "Alpha", source: "user", state: "loaded" },
      { entry_id: "4", domain: "mqtt", title: "Imported", source: "import", state: "loaded" },
      { entry_id: "5", domain: "mqtt", title: "Broken", source: "user", state: "setup_error" },
    ]));
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createConfigEntriesCommand().parseAsync(["--state", "loaded", "--source", "user"], { from: "user" });
    console.log = originalLog;
    expect((JSON.parse(output.join("\n")) as { config_entries: Array<{ entry_id: string }> }).config_entries
      .map((entry) => entry.entry_id)).toEqual(["1", "2", "3"]);
  });

  it("sorts tied count summaries alphabetically", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      { entry_id: "1", domain: "zeta", title: "Zeta", source: "user", state: "setup_error" },
      { entry_id: "2", domain: "alpha", title: "Alpha", source: "user", state: "loaded" },
    ]));
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createConfigEntriesCommand().parseAsync(["--count"], { from: "user" });
    console.log = originalLog;
    const result = JSON.parse(output.join("\n")) as {
      by_domain: Array<{ domain: string }>;
      by_state: Array<{ state: string }>;
    };
    expect(result.by_domain.map((row) => row.domain)).toEqual(["alpha", "zeta"]);
    expect(result.by_state.map((row) => row.state)).toEqual(["loaded", "setup_error"]);
  });
});
