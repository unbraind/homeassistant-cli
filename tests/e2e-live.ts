import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

const required = ["HASSIO_URL", "HASSIO_TOKEN"] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const repoRoot = process.cwd();
const cliPath = join(repoRoot, "dist", "cli.js");
const configDir = mkdtempSync(join(tmpdir(), "hassio-cli-e2e-"));
const configPath = join(configDir, "settings.json");
const hasInstalledHassio = spawnSync("which", ["hassio"], { encoding: "utf8" }).status === 0;

function run(args: string[], env?: NodeJS.ProcessEnv): string {
  const command = hasInstalledHassio ? "hassio" : "node";
  const commandArgs = hasInstalledHassio
    ? ["--config", configPath, ...args]
    : [cliPath, "--config", configPath, ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error(`Command failed: hassio ${args.join(" ")}`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

function parseJson(out: string): unknown {
  return JSON.parse(out);
}

function parseToon(out: string): Record<string, string> {
  const lines = out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const pairs = lines
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx < 0) {
        return undefined;
      }
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] as const;
    })
    .filter((value): value is readonly [string, string] => value !== undefined);
  return Object.fromEntries(pairs);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

run([
  "settings",
  "wizard",
  "--non-interactive",
  "--default-format",
  "toon",
  "--default-timeout",
  "30000",
  "--read-only",
  "false",
  "--skip-test",
], {
  HASSIO_URL: process.env.HASSIO_URL,
  HASSIO_TOKEN: process.env.HASSIO_TOKEN,
});

const paths = parseJson(run(["settings", "path"])) as Record<string, string>;
assert(Boolean(paths["settings"] && paths["auth"] && paths["data"]), "settings path output is incomplete");

const settingsFile = parseJson(readFileSync(configPath, "utf8") || "{}") as Record<string, unknown>;
assert(!("token" in settingsFile), "token must not be stored in settings.json");

run(["settings", "validate"], {
  HASSIO_URL: process.env.HASSIO_URL,
  HASSIO_TOKEN: process.env.HASSIO_TOKEN,
});

for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
  const statusOut = run(["status", "--format", format]);
  if (format === "toon") {
    const parsed = parseToon(statusOut);
    assert(parsed["message"] === "API running.", "invalid status TOON shape");
  }
  if (format === "json" || format === "json-compact") {
    parseJson(statusOut);
  }
  if (format === "yaml") {
    parseYaml(statusOut);
  }
  assert(statusOut.length > 0, `empty output for format ${format}`);
}

const services = parseJson(run(["services", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof services["total_services"] === "number", "invalid services --count JSON shape");

const entities = parseJson(run(["entities", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof entities["count"] === "number", "invalid entities --count JSON shape");

const configEntries = parseJson(run(["config-entries", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof configEntries["count"] === "number", "invalid config-entries --count JSON shape");

const config = parseJson(run(["config", "--format", "json"])) as Record<string, unknown>;
assert(typeof config["version"] === "string", "invalid config JSON shape");

const events = parseJson(run(["events", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof events["events_count"] === "number", "invalid events --count JSON shape");

const components = parseJson(run(["components", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof components["components_count"] === "number", "invalid components --count JSON shape");

const states = parseJson(run(["states", "--count", "--format", "json"])) as Record<string, unknown>;
assert(typeof states["states_count"] === "number", "invalid states --count JSON shape");

const flatServices = parseJson(run(["services", "--flat", "--format", "json"])) as Record<string, unknown>[];
assert(Array.isArray(flatServices), "invalid services --flat JSON shape");
assert(flatServices.length > 0, "services --flat returned no rows");
assert(typeof flatServices[0]?.["domain"] === "string", "invalid services --flat domain field");
assert(typeof flatServices[0]?.["service"] === "string", "invalid services --flat service field");

const wsConnect = parseJson(run(["websocket", "--connect-test", "--format", "json"])) as Record<string, unknown>;
assert(wsConnect["connected"] === true, "invalid websocket --connect-test connected field");
assert(wsConnect["auth"] === "ok", "invalid websocket --connect-test auth field");

const doctor = parseJson(run(["settings", "doctor", "--format", "json"])) as Record<string, unknown>;
assert(typeof doctor["healthy"] === "boolean", "invalid settings doctor JSON shape");

const capabilitiesProfile = parseJson(run(["capabilities", "--refresh", "--agent-profile", "--format", "json"])) as Record<string, unknown>;
assert(typeof capabilitiesProfile["source"] === "string", "invalid capabilities --agent-profile source");
const profile = capabilitiesProfile["profile"] as Record<string, unknown> | undefined;
assert(typeof profile?.["preferred_output_format"] === "string", "invalid capabilities --agent-profile output shape");

const capabilitiesContext = parseJson(
  run(["capabilities", "--refresh", "--agent-context", "--redact-private", "--format", "json"])
) as Record<string, unknown>;
assert(typeof capabilitiesContext["source"] === "string", "invalid capabilities --agent-context source");
const contextSummary = capabilitiesContext["summary"] as Record<string, unknown> | undefined;
assert(typeof contextSummary?.["entity_count"] === "number", "invalid capabilities --agent-context summary shape");
const contextProfile = capabilitiesContext["profile"] as Record<string, unknown> | undefined;
assert(contextProfile?.["preferred_output_format"] === "toon", "invalid capabilities --agent-context profile shape");

const schemaCount = parseJson(run(["schema", "--count", "--full", "--format", "json"])) as Record<string, unknown>;
assert(typeof schemaCount["command_count"] === "number", "invalid schema --count output shape");

console.log("Live e2e smoke test passed");
console.log(`binary:${hasInstalledHassio ? "hassio" : "node dist/cli.js"}`);
console.log(`config:${configPath}`);
