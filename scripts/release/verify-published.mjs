#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const tagIndex = process.argv.indexOf("--tag");
const tag = tagIndex >= 0 ? process.argv[tagIndex + 1] : null;
if (!tag?.startsWith("v")) {
  console.error("Usage: node scripts/release/verify-published.mjs --tag vYYYY.M.D[-N]");
  process.exit(2);
}

const version = tag.slice(1);
const packageName = "@unbrained/homeassistant-cli";

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr ?? ""}`);
  }
  return (result.stdout ?? "").trim();
}

function waitForRegistry() {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const result = spawnSync("npm", ["view", `${packageName}@${version}`, "version", "--json"], { encoding: "utf8" });
    if (result.status === 0 && JSON.parse(result.stdout) === version) return;
    if (attempt < 24) run("bash", ["-c", "sleep 5"], process.cwd());
  }
  throw new Error(`${packageName}@${version} did not become visible on the npm registry.`);
}

const npmDir = mkdtempSync(path.join(tmpdir(), "hassio-npm-published-"));
const bunDir = mkdtempSync(path.join(tmpdir(), "hassio-bun-published-"));
try {
  waitForRegistry();
  writeFileSync(path.join(npmDir, "package.json"), JSON.stringify({ private: true }));
  run("npm", ["install", "--ignore-scripts", `${packageName}@${version}`], npmDir);
  const npxVersion = run("npx", ["--yes", "--no-install", "homeassistant-cli", "--version"], npmDir, true);
  if (npxVersion !== version) throw new Error(`npx returned ${npxVersion}; expected ${version}.`);

  writeFileSync(path.join(bunDir, "package.json"), JSON.stringify({ private: true }));
  run("bun", ["add", `${packageName}@${version}`], bunDir);
  const bunxVersion = run("bunx", ["homeassistant-cli", "--version"], bunDir, true);
  if (bunxVersion !== version) throw new Error(`bunx returned ${bunxVersion}; expected ${version}.`);
  console.log(JSON.stringify({ ok: true, package: packageName, version, npm: true, npx: true, bun: true, bunx: true }, null, 2));
} finally {
  rmSync(npmDir, { recursive: true, force: true });
  rmSync(bunDir, { recursive: true, force: true });
}
