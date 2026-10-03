import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { describe, expect, it } from "vitest";

/** Run the real CLI against a synthetic server with an isolated configuration. */
function runRegistryCli(url: string, configDirectory: string, options: string[]): Promise<{
  code: string | number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    execFile(process.execPath, [
      "--import", "tsx", "src/cli.ts", "registries", ...options,
      "--url", url,
      "--config", join(configDirectory, "settings.json"),
      "--format", "json-compact", "--timeout", "1000",
    ], {
      env: {
        ...process.env,
        HOME: configDirectory,
        HASSIO_TOKEN: "synthetic-registry-token",
        HASSIO_CLI_SKIP_AUTO_RUN: "0",
        HASSIO_READONLY: "true",
        NO_PROXY: "*",
        no_proxy: "*",
      },
      timeout: 5000,
    }, (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }));
  });
}

const failureCases = [
  {
    label: "proxy credentials",
    message: "Rejected synthetic-registry-token via http://proxy-user:proxy-password@proxy.invalid:8080",
    sanitized: "Rejected [redacted] via http://[redacted]@proxy.invalid:8080",
    secrets: ["synthetic-registry-token", "proxy-user", "proxy-password"],
  },
  {
    label: "quoted credentials",
    message: 'Rejected {"password":"prefix,LEAK_COMMA space LEAK_SPACE\\\"LEAK_ESCAPE&?#;}"} secret=\'prefix\\\'LEAK_SINGLE\'',
    sanitized: 'Rejected {"password":"[redacted]"} secret=\'[redacted]\'',
    secrets: ["LEAK_COMMA", "LEAK_SPACE", "LEAK_ESCAPE", "LEAK_SINGLE"],
  },
];

describe("registry CLI failure exit status", () => {
  it.each([
    { options: ["--entities"], expectedRequests: 1 },
    { options: ["--display"], expectedRequests: 1 },
    { options: ["--entities", "--devices"], expectedRequests: 2 },
  ].flatMap(options => failureCases.map(failure => ({ ...options, ...failure }))))(
    "exits 1 for $options auth failures with $label and redacts both output streams",
    async ({ options, expectedRequests, message, sanitized, secrets }) => {
    const directory = await mkdtemp(join(tmpdir(), "ha-registry-cli-test-"));
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    const authenticatedWith: unknown[] = [];
    let closed = 0;
    server.on("connection", (socket) => {
      socket.on("close", () => { closed += 1; });
      socket.once("message", (data) => {
        authenticatedWith.push(JSON.parse(data.toString()));
        socket.send(JSON.stringify({
          type: "auth_invalid",
          message,
        }));
      });
      socket.send(JSON.stringify({ type: "auth_required", ha_version: "2026.8.1" }));
    });

    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (typeof address === "string" || address === null) throw new Error("Expected test server port");
      const result = await runRegistryCli(`http://127.0.0.1:${address.port}`, directory, options);
      expect(result.code).toBe(1);
      expect(authenticatedWith).toEqual(Array.from({ length: expectedRequests }, () => ({
        type: "auth", access_token: "synthetic-registry-token",
      })));
      expect(closed).toBe(expectedRequests);
      const records = result.stdout.trim().split("\n").map(line => JSON.parse(line));
      expect(records).toHaveLength(expectedRequests);
      for (const record of records) {
        expect(record).toMatchObject({
          success: false,
          error: sanitized,
        });
      }
      expect(result.stderr).toContain("Error: Registry query failed:");
      for (const output of [result.stdout, result.stderr]) {
        expect(output).toContain("Rejected");
        for (const secret of secrets) {
          expect(output).not.toContain(secret);
        }
      }
    } finally {
      for (const client of server.clients) client.terminate();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  }, 10_000);
});
