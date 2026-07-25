import type { Command } from "commander";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env["HASSIO_CLI_SKIP_AUTO_RUN"] = "1";
});

import { createProgram } from "../src/cli.js";

type CommandPath = {
  command: Command;
  path: string[];
};

describe("CLI help surface", () => {
  it("supports --help on every command path and includes global flag section", async () => {
    const root = createProgram();
    const queue: CommandPath[] = [{ command: root, path: [] }];
    const visited = new Set<Command>();
    let checked = 0;

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry || visited.has(entry.command)) {
        continue;
      }
      visited.add(entry.command);

      const program = createProgram();
      let help = "";
      const commands = [program];
      while (commands.length > 0) {
        const command = commands.pop();
        if (!command) continue;
        command.exitOverride();
        command.configureOutput({
          writeOut: (text) => {
            help += text;
          },
          writeErr: (text) => {
            help += text;
          },
        });
        commands.push(...command.commands);
      }
      await expect(program.parseAsync(["node", "hassio", ...entry.path, "--help"]))
        .rejects.toMatchObject({ code: "commander.helpDisplayed" });
      expect(help).toContain("Usage:");
      if (entry.path.length > 0) {
        expect(help).toContain("Global flags:");
      }
      checked += 1;
      queue.push(...entry.command.commands.map((command) => ({
        command,
        path: [...entry.path, command.name()],
      })));
    }

    expect(checked).toBeGreaterThan(70);
  });
});
