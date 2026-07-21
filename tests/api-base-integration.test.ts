import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { HomeAssistantClient } from "../src/api/client.js";

describe("BaseClient real Undici boundary", () => {
  let server: Server;
  let baseUrl: string;
  let receivedAuthorization: string | undefined;

  beforeAll(async () => {
    server = createServer((request, response) => {
      receivedAuthorization = request.headers.authorization;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ message: "API running." }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("uses request options accepted by the installed Undici runtime", async () => {
    const client = new HomeAssistantClient({
      url: baseUrl,
      token: "boundary-token",
      outputFormat: "json",
      timeout: 5_000,
      readOnly: true,
    });

    await expect(client.getStatus()).resolves.toEqual({ message: "API running." });
    expect(receivedAuthorization).toBe("Bearer boundary-token");
  });
});
