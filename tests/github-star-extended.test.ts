import { describe, it, expect, vi } from "vitest";
import { getGitHubStarStatus, maybePromptToStarRepo } from "../src/utils/github-star.js";

interface GhCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

type ExecFn = (args: string[]) => Promise<GhCommandResult>;

function createExecStub(mapper: (key: string) => GhCommandResult): ExecFn {
  return async (args: string[]) => mapper(args.join(" "));
}

describe("github-star extended", () => {
  it("returns not_starred when viewerHasStarred is false", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("not_starred");
  });

  it("returns error when gh repo view fails", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: false, stdout: "", stderr: "error" };
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("error");
  });

  it("returns error when stdout is unexpected value", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "unexpected\n", stderr: "" };
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("error");
  });

  it("does nothing when user declines to star", async () => {
    const log = vi.fn();
    const warn = vi.fn();
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({
      exec,
      log,
      warn,
      isInteractive: true,
      prompt: async () => "n",
    });

    // Neither log nor warn should be called when user says no
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when starRepo fails", async () => {
    const log = vi.fn();
    const warn = vi.fn();
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      // Both star attempts fail
      if (key.includes("repo star")) return { ok: false, stdout: "", stderr: "some error" };
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({
      exec,
      log,
      warn,
      isInteractive: true,
      prompt: async () => "y",
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unable to star the repo"));
    expect(log).not.toHaveBeenCalled();
  });

  it("falls back to starRepo without --yes when flag is unknown", async () => {
    const log = vi.fn();
    const warn = vi.fn();
    const calls: string[] = [];
    const exec: ExecFn = async (args) => {
      const key = args.join(" ");
      calls.push(key);
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      // First star attempt fails with "unknown flag" error
      if (key.includes("--yes")) return { ok: false, stdout: "", stderr: "unknown flag: --yes" };
      // Fallback star without --yes succeeds
      if (key.startsWith("repo star")) return { ok: true, stdout: "", stderr: "" };
      return { ok: true, stdout: "", stderr: "" };
    };

    await maybePromptToStarRepo({
      exec,
      log,
      warn,
      isInteractive: true,
      prompt: async () => "yes",
    });

    // Should have tried the fallback without --yes
    expect(calls.some(c => c === "repo star unbraind/homeassistant-cli")).toBe(true);
    expect(log).toHaveBeenCalledWith("Thanks for starring homeassistant-cli on GitHub.");
  });
});
