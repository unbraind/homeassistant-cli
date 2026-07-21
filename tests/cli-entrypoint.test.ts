import { expect, it, vi } from "vitest";

const { promptMock, originalArgv } = vi.hoisted(() => {
  delete process.env["HASSIO_CLI_SKIP_AUTO_RUN"];
  const originalArgv = process.argv;
  process.argv = ["node", "hassio", "settings", "path"];
  return { promptMock: vi.fn(async () => undefined), originalArgv };
});
vi.mock("../src/utils/github-star.js", () => ({ maybePromptToStarRepo: promptMock }));
vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
import "../src/cli.js";

it("executes the production entrypoint by default", async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(promptMock).toHaveBeenCalledWith(undefined);
  process.argv = originalArgv;
});
