import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/publish.yml", "utf8");

describe("tag publication workflow contract", () => {
  it("provisions every external binary required by release verification", () => {
    expect(workflow).toContain("sudo apt-get install --yes ripgrep shellcheck");
    expect(workflow).toContain("aquasecurity/setup-trivy@");
    expect(workflow).toContain("version: v0.72.0");
  });

  it("defaults manual dispatches to a non-publishing rehearsal", () => {
    expect(workflow).toMatch(/dry_run:\n[\s\S]*?default: true\n[\s\S]*?type: boolean/);
    expect(workflow).toContain("RELEASE_DRY_RUN:");
    expect(workflow).toContain("Report non-publishing rehearsal");
  });

  it.each([
    "Publish package for npm and Bun consumers",
    "Verify npm, npx, Bun, and bunx consumption",
    "Create GitHub Release",
  ])("guards the irreversible '%s' step", (stepName) => {
    const escaped = stepName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(workflow).toMatch(
      new RegExp(`- name: ${escaped}\\n\\s+if: env\\.RELEASE_DRY_RUN != 'true'`),
    );
  });
});
