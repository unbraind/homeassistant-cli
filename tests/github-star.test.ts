import { describe, expect, it, vi } from "vitest";
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

describe("github-star", () => {
  it("should return unavailable when gh is missing", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") {
        return { ok: false, stdout: "", stderr: "not found" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("unavailable");
  });

  it("should return not_logged_in when gh auth status fails", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") {
        return { ok: true, stdout: "gh version 2", stderr: "" };
      }
      if (key === "auth status") {
        return { ok: false, stdout: "", stderr: "not logged in" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("not_logged_in");
  });

  it("should return starred when viewerHasStarred is true", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") {
        return { ok: true, stdout: "gh version 2", stderr: "" };
      }
      if (key === "auth status") {
        return { ok: true, stdout: "logged in", stderr: "" };
      }
      if (key.includes("repo view unbraind/homeassistant-cli")) {
        return { ok: true, stdout: "true\n", stderr: "" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("starred");
  });

  it("should print tip in non-interactive mode when not starred", async () => {
    const log = vi.fn();
    const exec = createExecStub((key) => {
      if (key === "--version") {
        return { ok: true, stdout: "gh version 2", stderr: "" };
      }
      if (key === "auth status") {
        return { ok: true, stdout: "logged in", stderr: "" };
      }
      if (key.includes("repo view unbraind/homeassistant-cli")) {
        return { ok: true, stdout: "false\n", stderr: "" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({ exec, log, isInteractive: false });

    expect(log).toHaveBeenCalledWith(
      "tip: You can support the project by starring https://github.com/unbraind/homeassistant-cli"
    );
  });

  it("should star repo when user accepts", async () => {
    const log = vi.fn();
    const calls: string[] = [];
    const exec = createExecStub((key) => {
      calls.push(key);
      if (key === "--version") {
        return { ok: true, stdout: "gh version 2", stderr: "" };
      }
      if (key === "auth status") {
        return { ok: true, stdout: "logged in", stderr: "" };
      }
      if (key.includes("repo view unbraind/homeassistant-cli")) {
        return { ok: true, stdout: "false\n", stderr: "" };
      }
      if (key === "repo star unbraind/homeassistant-cli --yes") {
        return { ok: true, stdout: "", stderr: "" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({
      exec,
      log,
      isInteractive: true,
      prompt: async () => "y",
    });

    expect(calls).toContain("repo star unbraind/homeassistant-cli --yes");
    expect(log).toHaveBeenCalledWith("Thanks for starring homeassistant-cli on GitHub.");
  });
});
