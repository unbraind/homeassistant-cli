import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { connect, type Socket, type AddressInfo } from "node:net";
import { once } from "node:events";
import { WebSocketServer } from "ws";
import { WebSocketRegistryClient } from "../src/api/registries.js";

const resources: (() => Promise<void>)[] = [];
const config = { token: "synthetic-token", outputFormat: "json" as const, timeout: 1500, readOnly: true };

beforeEach(() => {
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy"]) {
    vi.stubEnv(key, "");
  }
});
afterEach(async () => {
  for (const close of resources.reverse()) await close();
  resources.length = 0;
  vi.unstubAllEnvs();
});

async function listen(server: Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  resources.push(() => new Promise<void>(resolve => server.close(() => resolve())));
  return (server.address() as AddressInfo).port;
}

async function registryServer(): Promise<{ port: number; messages: Record<string, unknown>[] }> {
  const server = createServer();
  const ws = new WebSocketServer({ server });
  const messages: Record<string, unknown>[] = [];
  ws.on("connection", socket => {
    socket.send(JSON.stringify({ type: "auth_required" }));
    socket.on("message", raw => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (message.type === "auth") {
        socket.send(JSON.stringify({ type: "auth_ok" }));
      } else {
        socket.send(JSON.stringify({ id: message.id, type: "result", success: true, result: [] }));
      }
    });
  });
  const port = await listen(server);
  resources.push(() => new Promise<void>(resolve => {
    for (const client of ws.clients) client.terminate();
    ws.close(() => resolve());
  }));
  return { port, messages };
}

async function proxyServer(targetPort: number, status = 200): Promise<{ port: number; requests: { target: string | undefined; auth: string | undefined }[] }> {
  const server = createServer();
  const sockets = new Set<Socket>();
  const requests: { target: string | undefined; auth: string | undefined }[] = [];
  server.on("connect", (request, socket, head) => {
    requests.push({ target: request.url, auth: request.headers["proxy-authorization"] });
    if (status !== 200) {
      socket.end(`HTTP/1.1 ${status} Proxy rejected\r\nContent-Length: 0\r\n\r\n`);
      return;
    }
    const upstream = connect(targetPort, "127.0.0.1", () => {
      socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    sockets.add(upstream);
    sockets.add(socket as Socket);
    socket.on("close", () => upstream.destroy());
    upstream.on("error", () => socket.destroy());
  });
  const port = await listen(server);
  resources.push(async () => { for (const socket of sockets) socket.destroy(); });
  return { port, requests };
}

function client(url: string): WebSocketRegistryClient {
  const result = new WebSocketRegistryClient({ ...config, url });
  resources.push(() => result.close());
  return result;
}

describe("real local proxy WebSocket transport", () => {
  it("retrieves a registry through a proxy with no direct target DNS and isolates proxy auth", async () => {
    const target = await registryServer();
    const proxy = await proxyServer(target.port);
    vi.stubEnv("HTTP_PROXY", `http://proxy-user:proxy-password@127.0.0.1:${proxy.port}`);
    expect(await client("http://proxy-only.invalid:8123").getDeviceRegistry()).toEqual([]);
    expect(proxy.requests).toEqual([{
      target: "proxy-only.invalid:8123",
      auth: `Basic ${Buffer.from("proxy-user:proxy-password").toString("base64")}`,
    }]);
    expect(target.messages[0]).toEqual({ type: "auth", access_token: config.token });
    expect(target.messages.at(-1)?.["type"]).toBe("config/device_registry/list");
  });

  it("coalesces concurrent registry calls into one authenticated proxy connection", async () => {
    const target = await registryServer();
    const proxy = await proxyServer(target.port);
    vi.stubEnv("HTTP_PROXY", `http://127.0.0.1:${proxy.port}`);
    const registry = client("http://proxy-only.invalid:8123");
    expect(await Promise.all([registry.getEntityRegistry(), registry.getDeviceRegistry()])).toEqual([[], []]);
    expect(proxy.requests).toHaveLength(1);
    expect(target.messages.filter(message => message["type"] === "auth")).toHaveLength(1);
  });

  it("connects directly for a matching NO_PROXY host and port", async () => {
    const target = await registryServer();
    const proxy = await proxyServer(target.port, 502);
    vi.stubEnv("HTTP_PROXY", `http://127.0.0.1:${proxy.port}`);
    vi.stubEnv("NO_PROXY", `127.0.0.1:${target.port}`);
    expect(await client(`http://127.0.0.1:${target.port}`).getEntityRegistry()).toEqual([]);
    expect(proxy.requests).toEqual([]);
  });

  it("bounds silent CONNECT proxies and closes their pending sockets", async () => {
    const proxy = createServer();
    const peers: Socket[] = [];
    proxy.on("connect", (_request, socket) => {
      peers.push(socket as Socket);
      socket.resume();
    });
    const port = await listen(proxy);
    resources.push(async () => { for (const peer of peers) peer.destroy(); });
    vi.stubEnv("HTTP_PROXY", `http://127.0.0.1:${port}`);
    const registry = new WebSocketRegistryClient({ ...config, timeout: 100, url: "http://proxy-only.invalid:8123" });
    resources.push(() => registry.close());
    const start = Date.now();
    await expect(registry.getDeviceRegistry()).rejects.toThrow("WebSocket handshake timed out");
    expect(Date.now() - start).toBeLessThan(1000);
    expect(peers).toHaveLength(1);
    await vi.waitFor(() => expect(peers.every(peer => peer.readableEnded)).toBe(true));
  });

  it("closes a shared pending CONNECT and rejects every concurrent caller", async () => {
    const proxy = createServer();
    const peers: Socket[] = [];
    proxy.on("connect", (_request, socket) => { peers.push(socket as Socket); socket.resume(); });
    const port = await listen(proxy);
    resources.push(async () => { for (const peer of peers) peer.destroy(); });
    vi.stubEnv("HTTP_PROXY", `http://127.0.0.1:${port}`);
    const registry = new WebSocketRegistryClient({ ...config, timeout: 5000, url: "http://proxy-only.invalid:8123" });
    resources.push(() => registry.close());
    const outcomes = Promise.allSettled([registry.getDeviceRegistry(), registry.getEntityRegistry()]);
    await vi.waitFor(() => expect(peers).toHaveLength(1));
    const start = Date.now();
    await registry.close();
    expect(await outcomes).toEqual([
      { status: "rejected", reason: new Error("WebSocket connection closed") },
      { status: "rejected", reason: new Error("WebSocket connection closed") },
    ]);
    expect(Date.now() - start).toBeLessThan(1500);
    await vi.waitFor(() => expect(peers.every(peer => peer.readableEnded || peer.destroyed)).toBe(true));
  });

  it("keeps established proxy connections alive past the connection timeout", async () => {
    const target = await registryServer();
    const proxy = await proxyServer(target.port);
    vi.stubEnv("HTTP_PROXY", `http://127.0.0.1:${proxy.port}`);
    const registry = new WebSocketRegistryClient({ ...config, timeout: 100, url: "http://proxy-only.invalid:8123" });
    resources.push(() => registry.close());
    expect(await registry.getDeviceRegistry()).toEqual([]);
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(await registry.getEntityRegistry()).toEqual([]);
    expect(proxy.requests).toHaveLength(1);
  });

  it("preserves a proxy rejection instead of returning an empty registry", async () => {
    const proxy = await proxyServer(1, 407);
    vi.stubEnv("HTTP_PROXY", `http://127.0.0.1:${proxy.port}`);
    await expect(client("http://proxy-only.invalid:8123").getDeviceRegistry())
      .rejects.toThrow("Unexpected server response: 407");
    expect(proxy.requests).toHaveLength(1);
  });
});
