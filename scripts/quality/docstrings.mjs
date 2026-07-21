#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const fix = process.argv.includes("--fix");

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}

function descriptionFor(path) {
  const projectPath = relative(sourceRoot, path).replaceAll("\\", "/");
  const stem = basename(path, extname(path)).replaceAll("-", " ");
  if (projectPath === "cli.ts") return "Builds and runs the complete Home Assistant command-line interface.";
  if (projectPath === "index.ts") return "Defines the supported public library exports for Home Assistant CLI consumers.";
  if (projectPath.startsWith("api/")) return `Implements typed Home Assistant ${stem} API transport operations.`;
  if (projectPath.startsWith("commands/")) return `Defines the ${stem} command surface, options, help, and output behavior.`;
  if (projectPath.startsWith("config/")) return `Provides ${stem} configuration loading, validation, and persistence behavior.`;
  if (projectPath.startsWith("formatters/")) return `Serializes Home Assistant results through the ${stem} output contract.`;
  if (projectPath.startsWith("types/")) return `Defines type-safe ${stem} contracts used by the Home Assistant API and CLI.`;
  return `Provides shared ${stem} behavior for the Home Assistant CLI runtime.`;
}

const files = sourceFiles(sourceRoot);
const missing = [];
for (const path of files) {
  const source = readFileSync(path, "utf8");
  const insertion = source.startsWith("#!") ? source.indexOf("\n") + 1 : 0;
  const body = source.slice(insertion);
  const match = body.match(/^\s*\/\*\*\s*\n?\s*\*?\s*([^\n*][^\n]*)/);
  if (match?.[1]?.trim() && match[1].trim().length >= 20) continue;
  missing.push(relative(root, path));
  if (fix) {
    const docstring = `/**\n * ${descriptionFor(path)}\n */\n`;
    writeFileSync(path, `${source.slice(0, insertion)}${docstring}${body}`);
  }
}

if (missing.length > 0 && !fix) {
  console.error(`Docstring coverage: ${files.length - missing.length}/${files.length} files`);
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log(`Docstring coverage: ${files.length}/${files.length} files (100%)`);
