import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

type CommandPath = string[];

function hasBunRuntime(): boolean {
  const check = spawnSync("bun", ["--version"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  return check.status === 0;
}

function runHelp(path: CommandPath): string {
  const cliPath = join(process.cwd(), "src", "cli.ts");
  const useBun = hasBunRuntime();
  const command = useBun ? "bun" : "node";
  const args = useBun
    ? [cliPath, ...path, "--help"]
    : ["--import", "tsx", cliPath, ...path, "--help"];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`help failed for '${path.join(" ") || "<root>"}':\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

function parseSubcommands(helpText: string): string[] {
  const lines = helpText.split("\n");
  const parsed = new Set<string>();
  let inCommandsSection = false;

  for (const line of lines) {
    if (line.trim() === "Commands:") {
      inCommandsSection = true;
      continue;
    }
    if (inCommandsSection && !line.startsWith("  ")) {
      inCommandsSection = false;
    }
    if (!inCommandsSection || !line.startsWith("  ")) {
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("-")) {
      continue;
    }

    const head = trimmed.split(/\s+/)[0] || "";
    if (!head || head === "help") {
      continue;
    }

    const commandName = head.split("|")[0] || "";
    if (!commandName || commandName === "help") {
      continue;
    }

    parsed.add(commandName);
  }

  return [...parsed];
}

describe("CLI help surface", () => {
  it("supports --help on every command path and includes global flag section", () => {
    const queue: CommandPath[] = [[]];
    const visited = new Set<string>();
    let checked = 0;
    const maxDepth = 3;

    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) {
        continue;
      }

      const key = path.join(" ");
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      const help = runHelp(path);
      expect(help).toContain("Usage:");
      if (path.length > 0) {
        expect(help).toContain("Global flags:");
      }
      checked += 1;

      if (path.length >= maxDepth) {
        continue;
      }

      const subcommands = parseSubcommands(help);
      for (const subcommand of subcommands) {
        queue.push([...path, subcommand]);
      }
    }

    expect(checked).toBeGreaterThan(70);
  }, 120000);
});
