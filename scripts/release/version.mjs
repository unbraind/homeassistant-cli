#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packagePath = path.join(root, "package.json");
const cliPath = path.join(root, "src/cli.ts");
const pattern = /^([1-9]\d{3})\.([1-9]\d*)\.([1-9]\d*)(?:-([2-9]|[1-9]\d+))?$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function dateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}`;
}

function parseVersion(version) {
  const match = pattern.exec(version);
  if (!match) fail(`Invalid calendar version: ${version}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail(`Invalid calendar date in version: ${version}`);
  }
  return { version, date: `${year}.${month}.${day}`, ordinal: match[4] ? Number(match[4]) : 1 };
}

function packageJson() {
  return JSON.parse(readFileSync(packagePath, "utf8"));
}

function cliVersion() {
  const match = readFileSync(cliPath, "utf8").match(/\.version\("([^"]+)"\)/);
  if (!match) fail("Could not find Commander .version() in src/cli.ts.");
  return match[1];
}

function publishedVersions(name) {
  try {
    const output = execFileSync("npm", ["view", name, "versions", "--json"], { encoding: "utf8" }).trim();
    if (!output) return [];
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    const stderr = String(error?.stderr ?? "");
    if (stderr.includes("E404") || stderr.includes("404 Not Found")) return [];
    fail(`Unable to query published versions: ${error.message}`);
  }
}

function nextVersion(targetDate = dateKey()) {
  parseVersion(targetDate);
  const versions = publishedVersions(packageJson().name)
    .map((version) => pattern.test(version) ? parseVersion(version) : null)
    .filter((entry) => entry?.date === targetDate);
  if (versions.length === 0) return targetDate;
  return `${targetDate}-${Math.max(...versions.map((entry) => entry.ordinal)) + 1}`;
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  if (!args[index + 1]) fail(`${name} requires a value.`);
  return args[index + 1];
}

function check(args) {
  const pkg = packageJson();
  parseVersion(pkg.version);
  const cli = cliVersion();
  if (cli !== pkg.version) fail(`Version mismatch: package.json=${pkg.version}, src/cli.ts=${cli}`);
  const tag = valueAfter(args, "--tag");
  if (tag && tag !== `v${pkg.version}`) fail(`Tag/version mismatch: tag=${tag}, expected=v${pkg.version}`);
  if (args.includes("--verify-next")) {
    const expected = nextVersion(valueAfter(args, "--date") ?? dateKey());
    if (pkg.version !== expected) fail(`Version is not next publishable version: current=${pkg.version}, expected=${expected}`);
  }
  console.log(`Version policy check passed (${pkg.version}).`);
}

function apply(args) {
  const version = valueAfter(args, "--version") ?? nextVersion(valueAfter(args, "--date") ?? dateKey());
  parseVersion(version);
  const pkg = packageJson();
  pkg.version = version;
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  const cli = readFileSync(cliPath, "utf8");
  const updated = cli.replace(/\.version\("[^"]+"\)/, `.version("${version}")`);
  if (updated === cli) fail("Commander version replacement did not change src/cli.ts.");
  writeFileSync(cliPath, updated);
  check([]);
  console.log(version);
}

const [command = "check", ...args] = process.argv.slice(2);
if (command === "check") check(args);
else if (command === "next") console.log(nextVersion(valueAfter(args, "--date") ?? dateKey()));
else if (command === "apply") apply(args);
else fail(`Unknown command: ${command}`);
