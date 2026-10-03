import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { connect, type AddressInfo, type Socket } from "node:net";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { WebSocketServer } from "ws";
import { describe, expect, it, vi } from "vitest";

const run = promisify(execFile);

describe("verified TLS through WebSocket environment proxies", () => {
  it.each(["http", "https"].flatMap(scheme => ["node", "bun"].map(runtime => ({ scheme, runtime }))))(
    "retrieves WSS registries through an $scheme proxy on $runtime", async ({ scheme, runtime }) => {
    const directory = await mkdtemp(join(tmpdir(), "ha-tls-proxy-test-"));
    const keyPath = join(directory, "key.pem");
    const certPath = join(directory, "cert.pem");
    // Generate disposable test-only trust material; never weaken TLS verification.
    await run("openssl", [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-keyout", keyPath, "-out", certPath, "-subj", "/CN=ha.proxy.invalid",
      "-addext", "subjectAltName=DNS:ha.proxy.invalid,IP:127.0.0.1",
    ]);
    const credentials = { key: await readFile(keyPath), cert: await readFile(certPath) };
    const target = createHttpsServer(credentials);
    const ws = new WebSocketServer({ server: target });
    const authenticated: unknown[] = [];
    ws.on("connection", (socket, request) => {
      expect(request.headers["proxy-authorization"]).toBeUndefined();
      socket.on("error", () => socket.terminate());
      socket.on("message", data => {
        const message = JSON.parse(data.toString());
        if (message.type === "auth") {
          authenticated.push(message);
          socket.send(JSON.stringify({ type: "auth_ok" }));
        } else {
          socket.send(JSON.stringify({ id: message.id, type: "result", success: true, result: [] }));
        }
      });
      socket.send(JSON.stringify({ type: "auth_required" }));
    });
    const proxy = scheme === "https" ? createHttpsServer(credentials) : createHttpServer();
    const sockets = new Set<Socket>();
    const connections: string[] = [];
    try {
      target.listen(0, "127.0.0.1");
      await once(target, "listening");
      const targetPort = (target.address() as AddressInfo).port;
      proxy.on("connect", (request, socket) => {
        connections.push(request.url ?? "");
        expect(request.headers["proxy-authorization"]).toBe(`Basic ${Buffer.from("proxy-user:proxy-password").toString("base64")}`);
        const upstream = connect(targetPort, "127.0.0.1", () => {
          socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          socket.pipe(upstream).pipe(socket);
        });
        sockets.add(socket as Socket);
        sockets.add(upstream);
        socket.on("close", () => upstream.destroy());
        socket.on("error", () => upstream.destroy());
        upstream.on("error", () => socket.destroy());
      });
      proxy.listen(0, "127.0.0.1");
      await once(proxy, "listening");
      const proxyPort = (proxy.address() as AddressInfo).port;
      const executable = runtime === "node" ? process.execPath : "bun";
      const args = [
        ...(runtime === "node" ? ["--import", "tsx"] : []), "src/cli.ts", "registries", "--devices", "--count",
        "--url", `https://ha.proxy.invalid:${targetPort}`,
        "--config", join(directory, "settings.json"), "--format", "json-compact", "--timeout", "3000",
      ];
      const options = {
        env: {
          ...process.env, HOME: directory, HASSIO_TOKEN: "synthetic-registry-token",
          HASSIO_READONLY: "true", HASSIO_CLI_SKIP_AUTO_RUN: "0",
          HTTP_PROXY: "", http_proxy: "", ALL_PROXY: "", all_proxy: "", NO_PROXY: "", no_proxy: "", https_proxy: "",
          HTTPS_PROXY: `${scheme}://proxy-user:proxy-password@127.0.0.1:${proxyPort}`,
          NODE_EXTRA_CA_CERTS: certPath,
          // Exercise diagnostics as well: the proxy agent must never print credentials.
          DEBUG: "https-proxy-agent",
        },
        timeout: 8000,
      };
      const result = await run(executable, args, options);
      expect(JSON.parse(result.stdout)).toEqual({ device_registry_count: 0 });
      expect(connections).toEqual([`ha.proxy.invalid:${targetPort}`]);
      expect(authenticated).toEqual([{ type: "auth", access_token: "synthetic-registry-token" }]);
      for (const secret of ["proxy-user", "proxy-password", "synthetic-registry-token"]) {
        expect(result.stdout + result.stderr).not.toContain(secret);
      }

      // A proxy that accepts CONNECT but never answers must not outlive the CLI timeout.
      proxy.removeAllListeners("connect");
      const stalled: Socket[] = [];
      proxy.on("connect", (_request, socket) => {
        stalled.push(socket as Socket);
        sockets.add(socket as Socket);
        socket.on("error", () => socket.destroy());
        socket.resume();
      });
      const failure = await run(executable, [...args.slice(0, -1), "100"], options)
        .catch(error => ({ code: error.code, stdout: error.stdout, stderr: error.stderr }));
      expect(failure).toMatchObject({ code: 1 });
      expect(failure.stdout).toContain('"success":false');
      expect(failure.stderr).toContain("WebSocket handshake timed out");
      expect(stalled).toHaveLength(1);
      await vi.waitFor(() => expect(stalled[0]?.readableEnded || stalled[0]?.destroyed).toBe(true));
    } finally {
      for (const socket of ws.clients) socket.terminate();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolve => ws.close(() => resolve()));
      await new Promise<void>(resolve => target.close(() => resolve()));
      await new Promise<void>(resolve => proxy.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  }, 15_000);
});
