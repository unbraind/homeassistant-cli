#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}

const failures = [];
for (const path of sourceFiles(join(process.cwd(), "src"))) {
  let blockComment = false;
  const codeLines = readFileSync(path, "utf8").split("\n").filter((line) => {
    const trimmed = line.trim();
    if (blockComment) {
      if (trimmed.includes("*/")) blockComment = false;
      return false;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) blockComment = true;
      return false;
    }
    return trimmed !== "" && !trimmed.startsWith("//");
  }).length;
  if (codeLines > 300) failures.push(`${relative(process.cwd(), path)}: ${codeLines}`);
}

if (failures.length > 0) {
  console.error(`Source files over the 300-code-line limit:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Source file size gate passed (all files <= 300 code lines).");
