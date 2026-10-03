/**
 * Selects an explicit HTTP CONNECT agent for environment-proxied WebSockets.
 */
import { HttpsProxyAgent } from "https-proxy-agent";
import { getProxyForUrl } from "proxy-from-env";

/** Cancel pending CONNECT sockets as well as sockets already owned by the agent. */
class WebSocketProxyAgent extends HttpsProxyAgent<string> {
  private readonly controller: AbortController;

  constructor(proxy: URL, headers: Record<string, string>) {
    const controller = new AbortController();
    super(proxy, { headers, signal: controller.signal });
    this.controller = controller;
  }

  override destroy(): void {
    this.controller.abort();
    super.destroy();
  }
}

/** Honor HTTP(S)_PROXY, ALL_PROXY, and NO_PROXY without exposing proxy credentials. */
export function websocketProxyAgent(wsUrl: string): HttpsProxyAgent<string> | false {
  const target = new URL(wsUrl);
  target.protocol = target.protocol === "wss:" ? "https:" : "http:";
  const proxyUrl = getProxyForUrl(target.toString());
  if (!proxyUrl) return false;

  try {
    const proxy = new URL(proxyUrl);
    if (proxy.protocol !== "http:" && proxy.protocol !== "https:") {
      throw new Error("Unsupported proxy protocol");
    }
    const headers: Record<string, string> = {};
    if (proxy.username || proxy.password) {
      const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
      headers["Proxy-Authorization"] = `Basic ${Buffer.from(credentials).toString("base64")}`;
      // The agent's debug diagnostics include proxy.href. Keep credentials out of it.
      proxy.username = "";
      proxy.password = "";
    }
    return new WebSocketProxyAgent(proxy, headers);
  } catch {
    throw new Error("Invalid WebSocket proxy configuration: expected an HTTP(S) proxy URL");
  }
}
