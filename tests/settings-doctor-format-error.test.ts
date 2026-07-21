import { describe, expect, it, vi } from "vitest";

vi.mock("../src/config/index.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123", token: "token", outputFormat: "json", timeout: 1000, readOnly: true,
  })),
  getConfigPath: vi.fn(() => "/tmp/settings.json"),
  getAuthPath: vi.fn(() => "/tmp/auth.json"),
  getDataPath: vi.fn(() => "/tmp/data.json"),
  getData: vi.fn(() => ({})),
}));
vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: class {
    async getStatus() { return { message: "API running." }; }
    async getConfig() { return { version: "1", location_name: "Home" }; }
    async getStates() { return []; }
  },
}));
vi.mock("../src/utils/github-star.js", () => ({ maybePromptToStarRepo: vi.fn() }));
vi.mock("../src/formatters/index.js", () => ({
  formatOutput: (value: unknown, format: string) => format === "yaml" ? "\tinvalid-yaml" : JSON.stringify(value),
}));

import { createDoctorCommand } from "../src/commands/settings-doctor.js";

vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

describe("settings doctor formatter diagnostics", () => {
  it("records a parser error for invalid formatter output", async () => {
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createDoctorCommand().parseAsync(["--skip-supervisor"], { from: "user" });
    console.log = originalLog;
    const result = JSON.parse(output.join("\n")) as {
      output_validation: { all_valid: boolean; by_format: Record<string, { valid: boolean; error?: string }> };
    };
    expect(result.output_validation.all_valid).toBe(false);
    expect(result.output_validation.by_format["yaml"]).toMatchObject({ valid: false, error: expect.any(String) });
  });
});
