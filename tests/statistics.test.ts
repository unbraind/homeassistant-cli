import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatisticsApiClient } from "../src/api/statistics.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

describe("StatisticsApiClient", () => {
  let client: StatisticsApiClient;

  beforeEach(() => {
    client = new StatisticsApiClient({
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

  describe("getStatistics", () => {
    it("should return statistics for entities", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          "sensor.temperature": [
            { start: "2024-01-01T00:00:00Z", end: "2024-01-01T01:00:00Z", mean: 22.5, min: 20, max: 25 },
            { start: "2024-01-01T01:00:00Z", end: "2024-01-01T02:00:00Z", mean: 23, min: 21, max: 26 },
          ],
        })
      );
      const result = await client.getStatistics({
        statisticIds: ["sensor.temperature"],
        period: "hour",
      });
      expect(result["sensor.temperature"]).toHaveLength(2);
      expect(result["sensor.temperature"][0]?.mean).toBe(22.5);
    });

    it("should include time range when provided", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({}));
      await client.getStatistics({
        statisticIds: ["sensor.temperature"],
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
        period: "day",
      });
      
      const bodyArg = mockRequest.mock.calls[0]?.[1]?.body;
      expect(bodyArg).toContain("start_time");
      expect(bodyArg).toContain("end_time");
    });
  });

  describe("getStatisticsDuringPeriod", () => {
    it("should return statistics during period", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          "sensor.temperature": [
            { 
              start: "2024-01-01T00:00:00Z", 
              end: "2024-01-01T01:00:00Z", 
              change: 0.5,
              max: 25,
              mean: 22.5,
              min: 20,
              state: 22,
              sum: 100,
            },
          ],
        })
      );
      const result = await client.getStatisticsDuringPeriod({
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
        statisticIds: ["sensor.temperature"],
        period: "hour",
        types: ["change", "max", "mean", "min", "state", "sum"],
      });
      expect(result["sensor.temperature"]).toHaveLength(1);
      expect(result["sensor.temperature"][0]?.change).toBe(0.5);
    });

    it("should call correct endpoint", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({}));
      await client.getStatisticsDuringPeriod({
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
        statisticIds: ["sensor.temperature"],
      });
      
      const url = mockRequest.mock.calls[0]?.[0] as string;
      expect(url).toContain("/statistics/during_period");
    });
  });
});
