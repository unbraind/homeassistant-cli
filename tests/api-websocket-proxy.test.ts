import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpsProxyAgent } from "https-proxy-agent";
import { websocketProxyAgent } from "../src/api/websocket-proxy.js";

const proxyVariables = [
  "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
  "http_proxy", "https_proxy", "all_proxy", "no_proxy",
];

beforeEach(() => {
  for (const key of proxyVariables) vi.stubEnv(key, "");
});
afterEach(() => vi.unstubAllEnvs());

describe("WebSocket environment proxy selection", () => {
  it("uses an explicit direct agent when no proxy is configured", () => {
    expect(websocketProxyAgent("ws://ha.example.test/api/websocket")).toBe(false);
    expect(websocketProxyAgent("wss://ha.example.test/api/websocket")).toBe(false);
  });

  it.each([
    ["HTTP_PROXY", "ws://ha.example.test/api/websocket"],
    ["HTTPS_PROXY", "wss://ha.example.test/api/websocket"],
    ["ALL_PROXY", "wss://ha.example.test/api/websocket"],
  ])("selects %s for %s without NODE_USE_ENV_PROXY", (key, target) => {
    vi.stubEnv("NODE_USE_ENV_PROXY", "0");
    vi.stubEnv(key, "http://proxy.example.test:8080");
    const agent = websocketProxyAgent(target);
    expect(agent).toBeInstanceOf(HttpsProxyAgent);
    expect((agent as HttpsProxyAgent<string>).proxy.href).toBe("http://proxy.example.test:8080/");
  });

  it("prefers lowercase variables and protocol-specific proxies", () => {
    vi.stubEnv("HTTPS_PROXY", "http://upper.example.test:8080");
    vi.stubEnv("https_proxy", "https://lower.example.test:8443");
    vi.stubEnv("ALL_PROXY", "http://fallback.example.test:8080");
    expect((websocketProxyAgent("wss://ha.example.test") as HttpsProxyAgent<string>).proxy.href)
      .toBe("https://lower.example.test:8443/");
  });

  it.each([
    ["ha.example.test", "wss://ha.example.test"],
    [".example.test", "ws://ha.example.test:8123"],
    ["*.example.test", "wss://ha.example.test:8123"],
    ["ha.example.test:443", "wss://ha.example.test"],
    ["ha.example.test:80", "ws://ha.example.test"],
    ["other.test, HA.EXAMPLE.TEST:8123", "ws://ha.example.test:8123"],
    ["[::1]:8123", "ws://[::1]:8123"],
    ["*", "wss://ha.example.test"],
  ])("bypasses proxy for NO_PROXY=%s and %s", (bypass, target) => {
    vi.stubEnv("ALL_PROXY", "http://proxy.example.test:8080");
    vi.stubEnv("NO_PROXY", bypass);
    expect(websocketProxyAgent(target)).toBe(false);
  });

  it("does not bypass different ports or hostname suffix lookalikes", () => {
    vi.stubEnv("ALL_PROXY", "http://proxy.example.test:8080");
    vi.stubEnv("NO_PROXY", "ha.example.test:8123,.example.test");
    expect(websocketProxyAgent("wss://notexample.test:8123")).toBeInstanceOf(HttpsProxyAgent);
    vi.stubEnv("NO_PROXY", "ha.example.test:8123");
    expect(websocketProxyAgent("wss://ha.example.test:443")).toBeInstanceOf(HttpsProxyAgent);
  });

  it("prefers lowercase no_proxy", () => {
    vi.stubEnv("HTTP_PROXY", "http://proxy.example.test:8080");
    vi.stubEnv("NO_PROXY", "other.test");
    vi.stubEnv("no_proxy", "ha.example.test");
    expect(websocketProxyAgent("ws://ha.example.test")).toBe(false);
  });

  it.each([
    ["user:p%40ss", "user:p@ss"],
    [":password", ":password"],
    ["user", "user:"],
  ])("keeps %s credentials out of agent diagnostics", (userinfo, decoded) => {
    vi.stubEnv("HTTPS_PROXY", `http://${userinfo}@proxy.example.test:8080`);
    const agent = websocketProxyAgent("wss://ha.example.test") as HttpsProxyAgent<string>;
    expect(agent.proxy.href).toBe("http://proxy.example.test:8080/");
    expect(agent.proxyHeaders).toEqual({ "Proxy-Authorization": `Basic ${Buffer.from(decoded).toString("base64")}` });
  });

  it.each(["http://user:secret@[invalid", "socks5://user:secret@proxy.test", "http://user:%ZZ@proxy.test"])(
    "rejects invalid proxy configuration without echoing it", (proxy) => {
      vi.stubEnv("HTTP_PROXY", proxy);
      expect(() => websocketProxyAgent("ws://ha.example.test"))
        .toThrow("Invalid WebSocket proxy configuration: expected an HTTP(S) proxy URL");
    },
  );
});
