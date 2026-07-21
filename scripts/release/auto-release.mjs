#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const dryRun = args.has("--dry-run");
const push = args.has("--push");
const allowSameDay = args.has("--allow-same-day-release");
const token = process.env.RELEASE_PUSH_TOKEN?.trim() ?? "";
delete process.env.RELEASE_PUSH_TOKEN;

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture
      ? ["ignore", "pipe", "pipe"]
      : json
        ? ["ignore", process.stderr, process.stderr]
        : "inherit",
    env: { ...process.env, ...options.env },
  });
  if (result.error) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
    throw new Error(`${command} ${commandArgs.join(" ")} failed${detail ? `\n${detail}` : ""}`);
  }
  return (result.stdout ?? "").trim();
}

function git(commandArgs, capture = true, env = {}) {
  return run("git", commandArgs, { capture, env });
}

function result(value, message) {
  if (json) console.log(JSON.stringify(value, null, 2));
  else console.log(message);
}

function utcDate() {
  const now = new Date();
  return `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}`;
}

function ensureClean() {
  const status = git(["status", "--porcelain"]);
  if (status) throw new Error("Release pipeline requires a clean working tree.");
}

function latestTag() {
  const found = spawnSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v*"], {
    cwd: root,
    encoding: "utf8",
  });
  return found.status === 0 ? found.stdout.trim() : null;
}

function changedFiles(tag) {
  const output = tag ? git(["diff", "--name-only", `${tag}..HEAD`]) : git(["ls-files"]);
  return output.split(/\r?\n/).filter(Boolean);
}

function isReleaseRelevant(file) {
  return !file.startsWith(".agents/pm/");
}

function installLatestChangelog() {
  run("bunx", ["@unbrained/pm-cli@latest", "install", "npm:pm-changelog", "--project"]);
}

function generateChangelog(output, version) {
  run("bunx", [
    "@unbrained/pm-cli@latest", "changelog", "generate",
    "--output", output,
    "--title", "Changelog",
    "--mode", "replace",
    "--release-version", version,
    "--all-release-tags",
    "--status", "closed",
    "--item-url-base", "https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm",
  ]);
  const changelog = readFileSync(output, "utf8");
  if (!changelog.includes(`## ${version} -`)) throw new Error(`Generated changelog has no ${version} release section.`);
}

function gitIdentity(author) {
  const slug = author.toLowerCase().replace(/[^a-z0-9._-]/g, "-") || "release-automation";
  return {
    GIT_AUTHOR_NAME: author,
    GIT_AUTHOR_EMAIL: `${slug}@users.noreply.github.com`,
    GIT_COMMITTER_NAME: author,
    GIT_COMMITTER_EMAIL: `${slug}@users.noreply.github.com`,
  };
}

function pushRefs(tag, identity) {
  if (!token) throw new Error("RELEASE_PUSH_TOKEN is required when --push is enabled.");
  const auth = `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  const env = {
    ...identity,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: auth,
  };
  git(["push", "--atomic", "origin", "HEAD:master", tag], false, env);
}

function main() {
  if (dryRun && push) throw new Error("--dry-run and --push cannot be combined.");
  ensureClean();
  const tag = latestTag();
  const commits = Number(git(["rev-list", "--count", tag ? `${tag}..HEAD` : "HEAD"]));
  if (commits === 0) return result({ ok: true, skipped: true, reason: "no_changes_since_last_tag", last_tag: tag }, "No changes since the last release tag.");
  const changed = changedFiles(tag);
  const relevant = changed.filter(isReleaseRelevant);
  if (relevant.length === 0) return result({ ok: true, skipped: true, reason: "tracker_only_changes_since_last_tag", last_tag: tag, ignored_change_paths: changed }, "Only tracker changes exist since the last release tag.");

  const today = utcDate();
  const todayTags = git(["tag", "--list", `v${today}*`])
    .split(/\r?\n/)
    .filter((candidate) => candidate === `v${today}` || candidate.startsWith(`v${today}-`));
  if (!allowSameDay && todayTags.length > 0) return result({ ok: true, skipped: true, reason: "release_already_cut_today", tags_today: todayTags }, `Release already exists for ${today}.`);
  const version = allowSameDay
    ? run(process.execPath, ["scripts/release/version.mjs", "next"], { capture: true })
    : today;
  const temp = mkdtempSync(path.join(tmpdir(), "homeassistant-cli-release-"));
  const preview = path.join(temp, "CHANGELOG.md");
  try {
    installLatestChangelog();
    generateChangelog(preview, version);
    if (!dryRun) {
      run(process.execPath, ["scripts/release/version.mjs", "apply", "--version", version]);
      writeFileSync(path.join(root, "CHANGELOG.md"), readFileSync(preview));
      git(["add", "package.json", "src/cli.ts", "CHANGELOG.md", ".agents/pm/extensions"], false);
    }
    run("bun", ["run", "release:verify"]);
    run("bun", ["run", "release:dry-run"]);
    if (!dryRun) {
      const author = "github-actions[bot]";
      const identity = gitIdentity(author);
      git(["add", "package.json", "src/cli.ts", "CHANGELOG.md", ".agents/pm/extensions"], false);
      git(["commit", "-m", `chore(release): v${version}`], false, identity);
      git(["tag", `v${version}`], false);
      if (push) pushRefs(`v${version}`, identity);
    }
    result({ ok: true, skipped: false, dry_run: dryRun, pushed: push && !dryRun, target_version: version, tag: `v${version}`, last_tag: tag, commits_since_last_tag: commits, release_relevant_files: relevant }, `Release pipeline completed for ${version}${dryRun ? " (dry run)" : ""}.`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
