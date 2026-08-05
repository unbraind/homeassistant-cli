import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeAssistantReadOnlyError } from "../src/api/errors.js";

const { call, close, request } = vi.hoisted(() => ({
  call: vi.fn(async (): Promise<unknown> => ({})),
  close: vi.fn(async () => undefined),
  request: vi.fn(),
}));

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { call, close };
  }),
}));

vi.mock("undici", () => ({ request }));

import { DiagnosticsApiClient } from "../src/api/diagnostics.js";

const writableConfig = {
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "json" as const,
  timeout: 30000,
  readOnly: false,
};

describe("DiagnosticsApiClient", () => {
  beforeEach(() => {
    call.mockReset();
    call.mockResolvedValue({});
    close.mockClear();
    request.mockReset();
  });

  it("calls typed repair issue websocket contracts", async () => {
    const client = new DiagnosticsApiClient(writableConfig);
    call.mockResolvedValueOnce({ issues: [] }).mockResolvedValueOnce({ issue_data: null });
    await expect(client.listRepairIssues()).resolves.toEqual({ issues: [] });
    await expect(client.getRepairIssueData("domain", "issue")).resolves.toEqual({
      issue_data: null,
    });
    expect(call).toHaveBeenNthCalledWith(1, "repairs/list_issues");
    expect(call).toHaveBeenNthCalledWith(2, "repairs/get_issue_data", {
      domain: "domain",
      issue_id: "issue",
    });
  });

  it("changes repair ignore state when writes are allowed", async () => {
    const client = new DiagnosticsApiClient(writableConfig);
    await client.setRepairIssueIgnored("domain", "issue", true);
    expect(call).toHaveBeenCalledWith("repairs/ignore_issue", {
      domain: "domain",
      issue_id: "issue",
      ignore: true,
    });
  });

  it("blocks websocket repair writes in read-only mode", async () => {
    const client = new DiagnosticsApiClient({ ...writableConfig, readOnly: true });
    await expect(client.setRepairIssueIgnored("domain", "issue", false))
      .rejects.toBeInstanceOf(HomeAssistantReadOnlyError);
    expect(call).not.toHaveBeenCalled();
  });

  it("calls the related-resource websocket contract", async () => {
    const client = new DiagnosticsApiClient(writableConfig);
    call.mockResolvedValue({ entity: ["light.one"] });
    await expect(client.getRelatedResources("area", "kitchen"))
      .resolves.toEqual({ entity: ["light.one"] });
    expect(call).toHaveBeenCalledWith("search/related", {
      item_type: "area",
      item_id: "kitchen",
    });
  });

  it("starts, reads, and submits repair fix flows", async () => {
    const response = (value: unknown) => ({
      statusCode: 200,
      body: { text: async () => JSON.stringify(value) },
    });
    request
      .mockResolvedValueOnce(response({ flow_id: "one", step_id: "init" }))
      .mockResolvedValueOnce(response({ flow_id: "one", step_id: "confirm" }))
      .mockResolvedValueOnce(response({ flow_id: "one", type: "create_entry" }));
    const client = new DiagnosticsApiClient(writableConfig);
    await client.startRepairFlow("domain", "issue");
    await client.getRepairFlow("one");
    await client.submitRepairFlow("one", { confirm: true });

    expect(request.mock.calls.map((entry) => [entry[0], (entry[1] as { method: string }).method]))
      .toEqual([
        ["http://localhost:8123/api/repairs/issues/fix", "POST"],
        ["http://localhost:8123/api/repairs/issues/fix/one", "GET"],
        ["http://localhost:8123/api/repairs/issues/fix/one", "POST"],
      ]);
  });

  it("closes the shared websocket", async () => {
    await new DiagnosticsApiClient(writableConfig).close();
    expect(close).toHaveBeenCalledOnce();
  });
});
