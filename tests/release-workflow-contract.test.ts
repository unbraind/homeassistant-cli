import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/publish.yml", "utf8");
const dryRunWorkflow = readFileSync(".github/workflows/release-dry-run.yml", "utf8");
const packageJson = readFileSync("package.json", "utf8");

describe("tag publication workflow contract", () => {
  it("recreates ignored PM runtime directories in clean checkouts", () => {
    expect(packageJson).toContain(
      '"quality:pm": "mkdir -p .agents/pm/locks .agents/pm/search &&',
    );
  });

  it("provisions every external binary required by release verification", () => {
    for (const releaseWorkflow of [workflow, dryRunWorkflow]) {
      expect(releaseWorkflow).toContain("sudo apt-get install --yes ripgrep shellcheck");
      expect(releaseWorkflow).toContain("aquasecurity/setup-trivy@");
      expect(releaseWorkflow).toContain("version: v0.72.0");
      expect(releaseWorkflow.indexOf("Install release verification tools"))
        .toBeLessThan(releaseWorkflow.indexOf("Verify release quality gates"));
      expect(releaseWorkflow.indexOf("Setup Trivy"))
        .toBeLessThan(releaseWorkflow.indexOf("Verify release quality gates"));
    }
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
