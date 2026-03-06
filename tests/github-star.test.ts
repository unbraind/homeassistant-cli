import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGitHubStarStatus, maybePromptToStarRepo } from "../src/utils/github-star.js";

interface GhCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

type ExecFn = (args: string[]) => Promise<GhCommandResult>;

const {
  mockGetData,
  mockSaveData,
  resetDataStore,
  setDataStore,
} = vi.hoisted(() => {
  let dataStore: Record<string, unknown> = {};

  return {
    mockGetData: vi.fn(() => dataStore),
    mockSaveData: vi.fn((data: Record<string, unknown>) => {
      dataStore = { ...dataStore, ...data };
    }),
    resetDataStore: () => {
      dataStore = {};
    },
    setDataStore: (next: Record<string, unknown>) => {
      dataStore = next;
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

describe("github-star", () => {
  beforeEach(() => {
    resetDataStore();
    mockGetData.mockClear();
    mockSaveData.mockClear();
  });

  it("returns unavailable when gh is missing", async () => {
    const exec = createExecStub((key) => {
      if (key === "--version") {
        return { ok: false, stdout: "", stderr: "not found" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    const result = await getGitHubStarStatus(exec);
    expect(result).toBe("unavailable");
  });

  it("returns not_logged_in when gh auth status fails", async () => {
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

  it("returns starred when viewerHasStarred is true", async () => {
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

  it("skips gh checks in non-interactive mode", async () => {
    const log = vi.fn();
    const exec = vi.fn<ExecFn>().mockResolvedValue({ ok: true, stdout: "", stderr: "" });

    await maybePromptToStarRepo({ exec, log, isInteractive: false });

    expect(exec).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(mockSaveData).not.toHaveBeenCalled();
  });

  it("stars repo when user accepts and caches completion", async () => {
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
    expect(mockSaveData).toHaveBeenCalledWith(
      expect.objectContaining({
        githubStarPrompt: expect.objectContaining({
          completed: true,
          lastStatus: "starred",
          outcome: "starred_via_gh",
        }),
      }),
      undefined
    );
  });

  it("prints manual link and caches when gh is unavailable", async () => {
    const log = vi.fn();
    const exec = createExecStub((key) => {
      if (key === "--version") {
        return { ok: false, stdout: "", stderr: "not found" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    await maybePromptToStarRepo({
      exec,
      log,
      isInteractive: true,
      prompt: async () => "y",
    });

    expect(log).toHaveBeenCalledWith("Star this project: https://github.com/unbraind/homeassistant-cli");
    expect(mockSaveData).toHaveBeenCalledWith(
      expect.objectContaining({
        githubStarPrompt: expect.objectContaining({
          completed: true,
          lastStatus: "unavailable",
          outcome: "manual_link",
        }),
      }),
      undefined
    );
  });

  it("skips all checks when prompt state is already cached as completed", async () => {
    setDataStore({
      githubStarPrompt: {
        completed: true,
        checkedAt: "2026-03-06T00:00:00.000Z",
        lastStatus: "not_starred",
        outcome: "declined",
      },
    });

    const log = vi.fn();
    const exec = vi.fn<ExecFn>().mockResolvedValue({ ok: true, stdout: "", stderr: "" });

    await maybePromptToStarRepo({ exec, log, isInteractive: true });

    expect(exec).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(mockSaveData).not.toHaveBeenCalled();
  });
});
