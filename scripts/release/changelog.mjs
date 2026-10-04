import { readFileSync } from "node:fs";

/** Generate a dated pending release while retaining tag-derived historical sections. */
export function generateChangelog(output, version, run) {
  run("bunx", [
    "@unbrained/pm-cli@latest", "changelog", "generate",
    "--output", output,
    "--title", "Changelog",
    "--mode", "replace",
    "--release-version", version,
    "--date-from-version",
    "--all-release-tags",
    "--status", "closed",
    "--item-url-base", "https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm",
  ]);
  const changelog = readFileSync(output, "utf8");
  if (!changelog.includes(`## ${version} -`)) throw new Error(`Generated changelog has no ${version} release section.`);
}
