import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStatisticsCommand } from "../src/commands/statistics.js";

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

const sampleMetadata = [
  { statistic_id: "sensor.temperature", unit_of_measurement: "°C", source: "recorder" },
  { statistic_id: "sensor.power", unit_of_measurement: "W", source: "recorder" },
];

const sampleStats = {
  "sensor.temperature": [
    { start: "2024-01-01T00:00:00Z", mean: 21.5, min: 19.0, max: 23.0 },
    { start: "2024-01-01T01:00:00Z", mean: 22.0, min: 20.0, max: 24.0 },
  ],
};

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const errors: string[] = [];
  const originalLog = console.log;
  const originalErr = console.error;
  console.log = (msg: string) => output.push(msg);
  console.error = (msg: string) => errors.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    console.error = originalErr;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    console.error = originalErr;
    throw err;
  });
}

describe("statistics command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns statistics metadata with --metadata flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleMetadata));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--metadata"], { from: "user" })
    );

    expect(result).toContain("statistics_metadata");
    expect(result).toContain("sensor.temperature");
  });

  it("returns metadata count with --metadata --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleMetadata));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--metadata", "--count"], { from: "user" })
    );

    expect(result).toContain("statistics_metadata_count");
    const parsed = JSON.parse(result);
    expect(parsed.statistics_metadata_count).toBe(2);
  });

  it("handles 404 on metadata endpoint gracefully", async () => {
    // 404 causes base client to throw HomeAssistantApiError
    // The statistics command catches this and returns empty list
    mockRequest.mockResolvedValueOnce({
      statusCode: 404,
      body: { text: () => Promise.resolve('{"message":"Not Found"}'), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) },
    });

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--metadata"], { from: "user" })
    );

    // Should output fallback message (404 is caught)
    expect(result).toContain("statistics_metadata");
  });

  it("returns statistics for an entity", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStats));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "--entity-id", "sensor.temperature", "--period", "hour"],
        { from: "user" }
      )
    );

    expect(result).toContain("sensor.temperature");
  });

  it("returns statistics row count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStats));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "--entity-id", "sensor.temperature", "--count"],
        { from: "user" }
      )
    );

    expect(result).toContain("statistics_rows");
    expect(result).toContain("statistic_ids");
  });

  it("queries statistics with time range", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStats));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        [
          "node", "test",
          "--entity-id", "sensor.temperature",
          "--start-time", "2024-01-01T00:00:00Z",
          "--end-time", "2024-01-02T00:00:00Z",
        ],
        { from: "user" }
      )
    );

    expect(result).toContain("sensor.temperature");
  });

  it("queries during_period with --during-period", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStats));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        [
          "node", "test",
          "--entity-id", "sensor.temperature",
          "--during-period",
          "--start-time", "2024-01-01T00:00:00Z",
          "--end-time", "2024-01-02T00:00:00Z",
          "--types", "mean,max,min",
        ],
        { from: "user" }
      )
    );

    expect(result).toContain("sensor.temperature");
  });

  it("exits with error when entity-id missing (without --metadata)", async () => {
    const cmd = createStatisticsCommand();
    try {
      await captureLog(() =>
        cmd.parseAsync(["node", "test"], { from: "user" })
      );
    } catch {
      // error may propagate after mocked process.exit
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error when during-period missing start/end times", async () => {
    const cmd = createStatisticsCommand();
    try {
      await captureLog(() =>
        cmd.parseAsync(
          ["node", "test", "--entity-id", "sensor.x", "--during-period"],
          { from: "user" }
        )
      );
    } catch {
      // error may propagate after mocked process.exit
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("supports multiple entity IDs", async () => {
    const multiStats = {
      "sensor.temperature": sampleStats["sensor.temperature"],
      "sensor.power": [{ start: "2024-01-01T00:00:00Z", mean: 150 }],
    };
    mockRequest.mockResolvedValueOnce(mockResponse(multiStats));

    const cmd = createStatisticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "--entity-id", "sensor.temperature,sensor.power"],
        { from: "user" }
      )
    );

    expect(result).toContain("sensor.temperature");
    expect(result).toContain("sensor.power");
  });
});
