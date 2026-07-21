import { describe, expect, it, vi } from "vitest";

vi.mock("yaml", () => ({
  parse: () => { throw "invalid yaml"; },
  stringify: (value: unknown) => JSON.stringify(value),
}));
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

import { createDoctorCommand } from "../src/commands/settings-doctor.js";

describe("settings doctor non-Error parser diagnostics", () => {
  it("stringifies a non-Error parser failure", async () => {
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createDoctorCommand().parseAsync(["--skip-supervisor"], { from: "user" });
    console.log = originalLog;
    const result = JSON.parse(output.join("\n")) as {
      output_validation: { by_format: Record<string, { error?: string }> };
    };
    expect(result.output_validation.by_format["yaml"]?.error).toBe("invalid yaml");
  });
});
