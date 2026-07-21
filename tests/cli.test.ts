import { beforeAll, describe, expect, it, vi } from "vitest";

const { promptMock } = vi.hoisted(() => {
  process.env["HASSIO_CLI_SKIP_AUTO_RUN"] = "1";
  return { promptMock: vi.fn(async () => undefined) };
});
vi.mock("../src/utils/github-star.js", () => ({ maybePromptToStarRepo: promptMock }));

import { createProgram, getConfigPathFromArgv, reportCliError, runCli } from "../src/cli.js";

describe("CLI composition", () => {
  beforeAll(() => {
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  it("registers the complete command tree and version", () => {
    const program = createProgram();
    expect(program.name()).toBe("hassio");
    expect(program.version()).toBe("2026.7.21-2");
    expect(program.commands.map((command) => command.name())).toEqual(expect.arrayContaining([
      "status", "settings", "capabilities", "websocket", "supervisor", "fan",
    ]));
  });

  it("recognizes long, short, and inline config arguments", () => {
    expect(getConfigPathFromArgv(["node", "hassio", "--config", "/tmp/a.json"])).toBe("/tmp/a.json");
    expect(getConfigPathFromArgv(["node", "hassio", "-c", "/tmp/b.json"])).toBe("/tmp/b.json");
    expect(getConfigPathFromArgv(["node", "hassio", "--config=/tmp/c.json"])).toBe("/tmp/c.json");
    expect(getConfigPathFromArgv(["node", "hassio", "status"])).toBeUndefined();
  });

  it("runs a non-network settings command with and without a custom config", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "hassio", "settings", "path"]);
    await runCli(["node", "hassio", "--config", "/tmp/custom.json", "settings", "path"]);
    expect(promptMock.mock.calls[0]).toEqual([undefined]);
    expect(promptMock.mock.calls).toContainEqual([{ configPath: "/tmp/custom.json" }]);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("reports Error and non-Error startup failures", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reportCliError(new Error("broken"));
    reportCliError("offline");
    expect(errorSpy).toHaveBeenNthCalledWith(1, "Error:", "broken");
    expect(errorSpy).toHaveBeenNthCalledWith(2, "Error:", "offline");
    expect(process.exit).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
  });
});
