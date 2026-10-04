import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_DEFAULTS } from "@unbrained/pm-cli/sdk";
import { generateChangelog } from "../scripts/release/changelog.mjs";

const pm = resolve("node_modules/@unbrained/pm-cli/dist/cli.js");
const extension = resolve(".agents/pm/extensions/pm-changelog");
let directory: string;
let tracker: string;

function git(args: string[], timestamp = "2026-10-03T18:00:00Z"): string {
  return execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_AUTHOR_NAME: "Release fixture",
      GIT_AUTHOR_EMAIL: "fixture@example.invalid",
      GIT_COMMITTER_NAME: "Release fixture",
      GIT_COMMITTER_EMAIL: "fixture@example.invalid",
      GIT_AUTHOR_DATE: timestamp,
      GIT_COMMITTER_DATE: timestamp,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function item(id: string, title: string, completed: string): string {
  const file = join(tracker, "issues", `${id}.toon`);
  writeFileSync(file, [
    `id: ${id}`, `title: ${title}`, "description: Synthetic release regression fixture.", "type: Issue", "status: closed", "priority: 1", "tags[0]:",
    `created_at: "${completed}"`, `updated_at: "${completed}"`,
    `closed_at: "${completed}"`, `completed_at: "${completed}"`,
    "resolution: Implemented and tested in an isolated fixture.", 'body: ""',
  ].join("\n") + "\n");
  return file;
}

function commit(timestamp: string): void {
  git(["add", ".agents/pm/settings.json", ".agents/pm/issues"]);
  git(["-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "test: record synthetic release work"], timestamp);
}

/** Exercise the real installed extension with the exact release argument list, without downloads. */
function runChangelog(command: string, args: string[]): string {
  expect(command).toBe("bunx");
  expect(args[0]).toBe("@unbrained/pm-cli@latest");
  return execFileSync(process.execPath, [pm, "--pm-path", tracker, ...args.slice(1)], {
    cwd: directory,
    encoding: "utf8",
    env: { ...process.env, HOME: directory, PM_TELEMETRY_DISABLED: "1", TZ: "UTC" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function generate(version: string): string {
  const output = join(directory, "CHANGELOG.md");
  generateChangelog(output, version, runChangelog);
  return readFileSync(output, "utf8");
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "ha-release-changelog-"));
  tracker = join(directory, ".agents", "pm");
  mkdirSync(join(tracker, "issues"), { recursive: true });
  mkdirSync(join(tracker, "extensions"));
  writeFileSync(join(tracker, "settings.json"), JSON.stringify({ ...SETTINGS_DEFAULTS, id_prefix: "fixture-", item_format: "toon" }));
  cpSync(extension, join(tracker, "extensions", "pm-changelog"), { recursive: true });
  symlinkSync(resolve("node_modules"), join(directory, "node_modules"), "dir");
  git(["init", "--quiet"]);
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("dated auto-release changelog generation", () => {
  it("reproduces the undated heading when the date fallback flag is omitted", () => {
    item("fixture-undated", "Prior-day release work", "2026-10-03T18:00:00Z");
    commit("2026-10-03T18:00:00Z");
    const output = join(directory, "CHANGELOG.md");
    expect(() => generateChangelog(output, "2026.10.4", (command: string, args: string[]) =>
      runChangelog(command, args.filter(arg => arg !== "--date-from-version"))))
      .toThrow("Generated changelog has no 2026.10.4 release section.");
    expect(readFileSync(output, "utf8")).toContain("## 2026.10.4\n\n### Fixed\n\n- Prior-day release work");
  });

  it("includes prior-day completed work under the release date without rewriting item timestamps or history", () => {
    item("fixture-old", "Previously shipped fix", "2026-10-01T12:00:00Z");
    commit("2026-10-02T12:00:00Z");
    git(["tag", "v2026.10.2"]);
    const pending = item("fixture-new", "Prior-day proxy fix", "2026-10-03T18:00:00Z");
    commit("2026-10-03T18:00:00Z");
    const original = readFileSync(pending, "utf8");

    const markdown = generate("2026.10.4");
    const [current, previous] = markdown.split("## 2026.10.2 - 2026-10-02");
    expect(current).toContain("## 2026.10.4 - 2026-10-04");
    expect(current).toContain("Prior-day proxy fix");
    expect(current).not.toContain("Previously shipped fix");
    expect(previous).toContain("Previously shipped fix");
    expect(previous).not.toContain("Prior-day proxy fix");
    expect(readFileSync(pending, "utf8")).toBe(original);
    expect(git(["diff", "--", ".agents/pm/issues"])).toBe("");

    commit("2026-10-04T06:00:00Z");
    git(["tag", "v2026.10.4"]);
    expect(generate("2026.10.4")).toBe(markdown);
  });

  it("keeps the pending window open for a same-day suffixed release", () => {
    item("fixture-old", "First release fix", "2026-10-04T02:00:00Z");
    commit("2026-10-04T04:00:00Z");
    git(["tag", "v2026.10.4"]);
    item("fixture-new", "Later same-day fix", "2026-10-04T05:00:00Z");
    commit("2026-10-04T05:00:00Z");
    const markdown = generate("2026.10.4-2");
    const [current, previous] = markdown.split("## 2026.10.4 - 2026-10-04");
    expect(current).toContain("## 2026.10.4-2 - 2026-10-04");
    expect(current).toContain("Later same-day fix");
    expect(current).not.toContain("First release fix");
    expect(previous).toContain("First release fix");
  });

  it("dates a first release without requiring an earlier tag", () => {
    item("fixture-first", "First release work", "2026-10-03T18:00:00Z");
    commit("2026-10-03T18:00:00Z");
    expect(generate("2026.10.4")).toContain("## 2026.10.4 - 2026-10-04\n\n### Fixed\n\n- First release work");
  });

  it("retains an existing tag's authoritative date instead of replacing it with the version date", () => {
    item("fixture-tagged", "Historically tagged work", "2026-10-02T18:00:00Z");
    commit("2026-10-03T06:00:00Z");
    git(["tag", "v2026.10.2"]);
    expect(generate("2026.10.2")).toContain("## 2026.10.2 - 2026-10-03");
  });

  it.each(["## Unreleased", "## 2026.10.4"])("still rejects an invalid generated heading: %s", (heading) => {
    const output = join(directory, "CHANGELOG.md");
    expect(() => generateChangelog(output, "2026.10.4", () => writeFileSync(output, `${heading}\n`)))
      .toThrow("Generated changelog has no 2026.10.4 release section.");
  });
});
