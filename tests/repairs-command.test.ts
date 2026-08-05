import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRepairsCommand } from "../src/commands/repairs.js";

const close = vi.fn(async () => undefined);
const listRepairIssues = vi.fn();
const getRepairIssueData = vi.fn();
const setRepairIssueIgnored = vi.fn();
const startRepairFlow = vi.fn();
const getRepairFlow = vi.fn();
const submitRepairFlow = vi.fn();

vi.mock("../src/api/diagnostics.js", () => ({
  DiagnosticsApiClient: vi.fn().mockImplementation(function () {
    return {
      close,
      listRepairIssues,
      getRepairIssueData,
      setRepairIssueIgnored,
      startRepairFlow,
      getRepairFlow,
      submitRepairFlow,
    };
  }),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

const issue = (overrides: Record<string, unknown>) => ({
  breaks_in_ha_version: null,
  created: "2026-08-01T00:00:00Z",
  dismissed_version: null,
  ignored: false,
  domain: "core",
  is_fixable: false,
  issue_domain: null,
  issue_id: "issue",
  learn_more_url: null,
  severity: "warning",
  translation_key: "issue",
  translation_placeholders: null,
  ...overrides,
});

describe("repairs commands", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    output.length = 0;
    close.mockClear();
    for (const mock of [
      listRepairIssues,
      getRepairIssueData,
      setRepairIssueIgnored,
      startRepairFlow,
      getRepairFlow,
      submitRepairFlow,
    ]) mock.mockReset();
    listRepairIssues.mockResolvedValue({ issues: [] });
    getRepairIssueData.mockResolvedValue({ issue_data: {} });
    setRepairIssueIgnored.mockResolvedValue(undefined);
    startRepairFlow.mockResolvedValue({ flow_id: "flow", step_id: "init" });
    getRepairFlow.mockResolvedValue({ flow_id: "flow", step_id: "confirm" });
    submitRepairFlow.mockResolvedValue({ flow_id: "flow", type: "create_entry" });
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("filters, sorts, summarizes, and bounds issue rows", async () => {
    listRepairIssues.mockResolvedValue({ issues: [
      issue({ severity: "error", domain: "z", issue_id: "b", is_fixable: true, ignored: true }),
      issue({ severity: "error", domain: "a", issue_id: "c", is_fixable: true, ignored: true }),
      issue({ severity: "error", domain: "a", issue_id: "a", is_fixable: true, ignored: true }),
      issue({ severity: "warning", domain: "a", issue_id: "x", is_fixable: true, ignored: true }),
      issue({ severity: "error", domain: "a", issue_id: "ignored-filter", is_fixable: false, ignored: true }),
      issue({ severity: "error", domain: "a", issue_id: "active-filter", is_fixable: true, ignored: false }),
    ] });
    await createRepairsCommand().parseAsync([
      "list", "--severity", "error", "--domain", "a", "--ignored", "--fixable", "--limit", "1",
    ], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      count: 2,
      by_severity: [{ severity: "error", count: 2 }],
      issues: [expect.objectContaining({ domain: "a", issue_id: "a" })],
    });
  });

  it("returns aggregate counts without issue identifiers", async () => {
    listRepairIssues.mockResolvedValue({ issues: [
      issue({ severity: "critical" }), issue({ severity: "warning", issue_id: "two" }),
    ] });
    await createRepairsCommand().parseAsync(["list", "--count"], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      count: 2,
      by_severity: [{ severity: "critical", count: 1 }, { severity: "warning", count: 1 }],
    });
  });

  it("shows one issue data payload", async () => {
    getRepairIssueData.mockResolvedValue({ issue_data: { safe: true } });
    await createRepairsCommand().parseAsync(["show", "domain", "issue"], { from: "user" });
    expect(getRepairIssueData).toHaveBeenCalledWith("domain", "issue");
    expect(JSON.parse(output.join("\n"))).toEqual({
      domain: "domain", issue_id: "issue", issue_data: { safe: true },
    });
  });

  it.each([
    [["ignore", "domain", "issue", "--yes"], true],
    [["ignore", "domain", "issue", "--restore", "--yes"], false],
  ])("changes issue ignore state with confirmation", async (args, ignored) => {
    await createRepairsCommand().parseAsync(args, { from: "user" });
    expect(setRepairIssueIgnored).toHaveBeenCalledWith("domain", "issue", ignored);
    expect(JSON.parse(output.join("\n"))).toEqual({ domain: "domain", issue_id: "issue", ignored });
  });

  it("requires confirmation before changing ignore state", async () => {
    await expect(createRepairsCommand().parseAsync(["ignore", "domain", "issue"], { from: "user" }))
      .rejects.toThrow("requires --yes");
    expect(setRepairIssueIgnored).not.toHaveBeenCalled();
  });

  it("starts and reads fix flows", async () => {
    await createRepairsCommand().parseAsync(["fix", "start", "domain", "issue", "--yes"], { from: "user" });
    expect(startRepairFlow).toHaveBeenCalledWith("domain", "issue");
    output.length = 0;
    await createRepairsCommand().parseAsync(["fix", "status", "flow"], { from: "user" });
    expect(getRepairFlow).toHaveBeenCalledWith("flow");
    expect(JSON.parse(output.join("\n"))).toEqual({ flow_id: "flow", step_id: "confirm" });
  });

  it("submits JSON object fix-flow input", async () => {
    await createRepairsCommand().parseAsync([
      "fix", "submit", "flow", "--data", "{\"confirm\":true}", "--yes",
    ], { from: "user" });
    expect(submitRepairFlow).toHaveBeenCalledWith("flow", { confirm: true });
  });

  it.each([
    [["fix", "start", "domain", "issue"], "requires --yes"],
    [["fix", "submit", "flow", "--data", "{}"], "requires --yes"],
    [["fix", "submit", "flow", "--data", "[]", "--yes"], "must be a JSON object"],
    [["list", "--limit", "1.5"], "Must be a positive integer"],
    [["list", "--severity", "notice"], "Unsupported severity 'notice'"],
    [["show", "  ", "issue"], "Domain must not be empty"],
    [["show", "domain", "  "], "Issue ID must not be empty"],
    [["ignore", "  ", "issue", "--yes"], "Domain must not be empty"],
    [["fix", "start", "  ", "issue", "--yes"], "Handler must not be empty"],
    [["fix", "start", "domain", "  ", "--yes"], "Issue ID must not be empty"],
    [["fix", "status", "  "], "Flow ID must not be empty"],
    [["fix", "submit", "  ", "--data", "{}", "--yes"], "Flow ID must not be empty"],
  ])("rejects unsafe or invalid repair input", async (args, message) => {
    await expect(createRepairsCommand().parseAsync(args, { from: "user" })).rejects.toThrow(message);
  });

  it("closes the websocket when an operation fails", async () => {
    listRepairIssues.mockRejectedValue(new Error("offline"));
    await expect(createRepairsCommand().parseAsync(["list"], { from: "user" })).rejects.toThrow("offline");
    expect(close).toHaveBeenCalledOnce();
  });
});
