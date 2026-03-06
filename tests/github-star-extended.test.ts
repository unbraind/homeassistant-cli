import { beforeEach, describe, it, expect, vi } from "vitest";
import { getGitHubStarStatus, maybePromptToStarRepo } from "../src/utils/github-star.js";

interface GhCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

type ExecFn = (args: string[]) => Promise<GhCommandResult>;

const { mockGetData, mockSaveData, resetDataStore } = vi.hoisted(() => {
  let dataStore: Record<string, unknown> = {};

  return {
    mockGetData: vi.fn(() => dataStore),
    mockSaveData: vi.fn((data: Record<string, unknown>) => {
      dataStore = { ...dataStore, ...data };
    }),
    resetDataStore: () => {
      dataStore = {};
    },
  };
});

vi.mock("../src/config/index.js", () => ({
  getData: (...args: unknown[]) => mockGetData(...args),
  saveData: (...args: unknown[]) => mockSaveData(...args),
}));

function createExecStub(mapper: (key: string) => GhCommandResult): ExecFn {
  return async (args: string[]) => mapper(args.join(" "));
}

describe("github-star extended", () => {
  beforeEach(() => {
    resetDataStore();
    mockGetData.mockClear();
    mockSaveData.mockClear();
  });

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

  it("prints manual link when gh is installed but not authenticated", async () => {
    const log = vi.fn();
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: false, stdout: "", stderr: "not logged in" };
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({
      exec,
      log,
      isInteractive: true,
    });

    expect(log).toHaveBeenCalledWith("Star this project: https://github.com/unbraind/homeassistant-cli");
    expect(mockSaveData).toHaveBeenCalledWith(
      expect.objectContaining({
        githubStarPrompt: expect.objectContaining({
          completed: true,
          lastStatus: "not_logged_in",
          outcome: "manual_link",
        }),
      }),
      undefined
    );
  });

  it("caches decline path so user is not prompted repeatedly", async () => {
    const prompt = vi.fn(async () => "n");
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({ exec, prompt, isInteractive: true });
    await maybePromptToStarRepo({ exec, prompt, isInteractive: true });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(mockSaveData).toHaveBeenCalledWith(
      expect.objectContaining({
        githubStarPrompt: expect.objectContaining({
          completed: true,
          lastStatus: "not_starred",
          outcome: "declined",
        }),
      }),
      undefined
    );
  });

  it("warns and saves manual-link outcome when star command fails", async () => {
    const warn = vi.fn();
    const exec = createExecStub((key) => {
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      if (key.includes("repo star")) return { ok: false, stdout: "", stderr: "some error" };
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({
      exec,
      warn,
      isInteractive: true,
      prompt: async () => "y",
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Unable to star the repo automatically"));
    expect(mockSaveData).toHaveBeenCalledWith(
      expect.objectContaining({
        githubStarPrompt: expect.objectContaining({
          completed: true,
          lastStatus: "error",
          outcome: "manual_link",
        }),
      }),
      undefined
    );
  });

  it("falls back to star command without --yes when flag is unknown", async () => {
    const log = vi.fn();
    const calls: string[] = [];
    const exec: ExecFn = async (args) => {
      const key = args.join(" ");
      calls.push(key);
      if (key === "--version") return { ok: true, stdout: "gh version 2", stderr: "" };
      if (key === "auth status") return { ok: true, stdout: "logged in", stderr: "" };
      if (key.includes("repo view")) return { ok: true, stdout: "false\n", stderr: "" };
      if (key.includes("--yes")) return { ok: false, stdout: "", stderr: "unknown flag: --yes" };
      if (key.startsWith("repo star")) return { ok: true, stdout: "", stderr: "" };
      return { ok: true, stdout: "", stderr: "" };
    };

    await maybePromptToStarRepo({
      exec,
      log,
      isInteractive: true,
      prompt: async () => "yes",
    });

    expect(calls).toContain("repo star unbraind/homeassistant-cli");
    expect(log).toHaveBeenCalledWith("Thanks for starring homeassistant-cli on GitHub.");
  });
});
