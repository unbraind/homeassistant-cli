import { describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { createStatusCommand } from "../src/commands/core.js";
import { attachGlobalFlagsHelp } from "../src/utils/command-helpers.js";

describe("global flags help", () => {
  it("appends global flags to runtime command help output", async () => {
    const program = new Command("hassio");
    const settings = new Command("settings").description("Settings commands");
    const status = createStatusCommand();
    program.exitOverride();

    settings.addCommand(new Command("validate").description("Validate config"));
    program.addCommand(status);
    program.addCommand(settings);
    attachGlobalFlagsHelp(program);

    const output: string[] = [];
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      output.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
      return true;
    });
    try {
      await program.parseAsync(["status", "--help"], { from: "user" }).catch(() => undefined);
    } finally {
      writeSpy.mockRestore();
    }
    const help = output.join("\n");
    expect(help).toContain("Global flags:");
    expect(help).toContain("--format <format>");
    expect(help).toContain("--read-only");
  });
});
