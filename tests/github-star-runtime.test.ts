import { beforeEach, describe, expect, it, vi } from "vitest";

const { execFileMock, createInterfaceMock, getDataMock, saveDataMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  createInterfaceMock: vi.fn(),
  getDataMock: vi.fn(() => ({})),
  saveDataMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({ execFile: execFileMock }));
vi.mock("node:readline", () => ({ createInterface: createInterfaceMock }));
vi.mock("../src/config/index.js", () => ({ getData: getDataMock, saveData: saveDataMock }));

import { getGitHubStarStatus, maybePromptToStarRepo } from "../src/utils/github-star.js";

describe("github star runtime adapters", () => {
  beforeEach(() => {
    execFileMock.mockReset();
    createInterfaceMock.mockReset();
    getDataMock.mockReset().mockReturnValue({});
    saveDataMock.mockReset();
  });

  it("uses the real gh adapter success path when no executor is injected", async () => {
    execFileMock.mockImplementation((
      _file: string,
      args: string[],
      _options: unknown,
      callback: (error: Error | null, stdout?: string, stderr?: string) => void,
    ) => callback(null, args[0] === "repo" ? "true\n" : "ok", ""));
    await expect(getGitHubStarStatus()).resolves.toBe("starred");
    expect(execFileMock).toHaveBeenCalledTimes(3);
  });

  it("normalizes a failed gh process with missing streams", async () => {
    execFileMock.mockImplementation((
      _file: string,
      _args: string[],
      _options: unknown,
      callback: (error: Error, stdout?: string, stderr?: string) => void,
    ) => callback(new Error("missing")));
    await expect(getGitHubStarStatus()).resolves.toBe("unavailable");
  });

  it("normalizes missing streams from a successful gh process", async () => {
    execFileMock.mockImplementation((
      _file: string,
      _args: string[],
      _options: unknown,
      callback: (error: Error | null, stdout?: string, stderr?: string) => void,
    ) => callback(null));
    await expect(getGitHubStarStatus()).resolves.toBe("error");
  });

  it("uses the terminal prompt and default logger to star interactively", async () => {
    execFileMock.mockImplementation((
      _file: string,
      args: string[],
      _options: unknown,
      callback: (error: Error | null, stdout?: string, stderr?: string) => void,
    ) => {
      const key = args.join(" ");
      callback(null, key.includes("repo view") ? "false\n" : "ok", "");
    });
    const close = vi.fn();
    createInterfaceMock.mockReturnValue({
      question: (_question: string, answer: (value: string) => void) => answer(" yes "),
      close,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await maybePromptToStarRepo({ isInteractive: true });

    expect(close).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Thanks for starring homeassistant-cli on GitHub.");
    errorSpy.mockRestore();
  });

  it("derives non-interactive mode from non-TTY streams when not specified", async () => {
    await maybePromptToStarRepo();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("evaluates both TTY streams when deriving interactive mode", async () => {
    const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
    const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
    getDataMock.mockReturnValue({ githubStarPrompt: { completed: true } });
    await maybePromptToStarRepo();
    expect(getDataMock).toHaveBeenCalled();
    if (stdinDescriptor) Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
    else Reflect.deleteProperty(process.stdin, "isTTY");
    if (stdoutDescriptor) Object.defineProperty(process.stdout, "isTTY", stdoutDescriptor);
    else Reflect.deleteProperty(process.stdout, "isTTY");
  });
});
