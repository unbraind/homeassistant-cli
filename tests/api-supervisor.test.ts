import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupervisorApiClient } from "../src/api/supervisor.js";

vi.mock("undici", () => ({ request: vi.fn() }));
import { request } from "undici";
const requestMock = request as ReturnType<typeof vi.fn>;

describe("Supervisor API proxy", () => {
  beforeEach(() => requestMock.mockReset());

  it("normalizes a supervisor path without a leading slash", async () => {
    requestMock.mockResolvedValueOnce({
      statusCode: 200,
      body: { text: async () => JSON.stringify({ result: "ok" }), arrayBuffer: async () => new ArrayBuffer(0) },
    });
    const client = new SupervisorApiClient({
      url: "http://localhost:8123", token: "token", outputFormat: "json", timeout: 1000, readOnly: false,
    });
    await expect(client.proxy("GET", "addons")).resolves.toEqual({ result: "ok" });
    expect(requestMock).toHaveBeenCalledWith(
      "http://localhost:8123/api/hassio/addons",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
