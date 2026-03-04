import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import { HomeAssistantWebSocketClient } from "../src/api/websocket.js";
import type { Config } from "../src/types/options.js";

// ──────────────────────────────────────────────────────────────
// Fake WebSocket – EventEmitter that mimics the ws.WebSocket API
// ──────────────────────────────────────────────────────────────
class FakeWs extends EventEmitter {
  readyState: number;
  sentMessages: string[] = [];

  constructor(readyState = 1 /* OPEN */) {
    super();
    this.readyState = readyState;
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    setImmediate(() => this.emit("close"));
  }
}

// ──────────────────────────────────────────────────────────────
// Configs
// ──────────────────────────────────────────────────────────────
const baseConfig: Config = {
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "toon",
  timeout: 5000,
  readOnly: false,
};

const fastConfig: Config = { ...baseConfig, timeout: 100 };

// ──────────────────────────────────────────────────────────────
// Module-level ws mock.
// We use separate `wsHelpers` so setNextWs lives in the same
// closure as the factory implementation, avoiding any issues with
// vi.fn() property assignment.
// ──────────────────────────────────────────────────────────────
const { mockWsConstructor, wsHelpers } = vi.hoisted(() => {
  let nextWs: FakeWs | null = null;

  const ctor = vi.fn().mockImplementation(() => {
    if (!nextWs) throw new Error("WS-MOCK: setNextWs() was not called before connect()");
    const ws = nextWs;
    nextWs = null;
    return ws;
  });

  // Attach OPEN as direct property so WebSocket.OPEN === 1
  (ctor as unknown as { OPEN: number }).OPEN = 1;

  const helpers = {
    setNextWs(ws: FakeWs) { nextWs = ws; },
    clearNext() { nextWs = null; },
  };

  return { mockWsConstructor: ctor, wsHelpers: helpers };
});

vi.mock("ws", () => ({ default: mockWsConstructor }));

// ──────────────────────────────────────────────────────────────
// Helper – FakeWs whose auth handshake fires via setImmediate
// so events arrive AFTER connect() registers its handlers.
// ──────────────────────────────────────────────────────────────
function buildAuthWs(onReady?: (ws: FakeWs) => void): FakeWs {
  const ws = new FakeWs(1);
  setImmediate(() => {
    ws.emit("open");
    setImmediate(() => {
      ws.emit("message", Buffer.from(JSON.stringify({ type: "auth_required" })));
      setImmediate(() => {
        ws.emit("message", Buffer.from(JSON.stringify({ type: "auth_ok" })));
        if (onReady) onReady(ws);
      });
    });
  });
  return ws;
}

// ──────────────────────────────────────────────────────────────
// Types for private-member access
// ──────────────────────────────────────────────────────────────
type InternalClient = {
  socket: FakeWs | null;
  pending: Map<number, unknown>;
  eventBuffers: Map<number, unknown[]>;
  parseMessage: (raw: string) => unknown;
  sendAndWait: (id: number, type: string, payload?: Record<string, unknown>) => Promise<unknown>;
  waitForMessage: <T>() => Promise<T>;
};

// ══════════════════════════════════════════════════════════════

describe("HomeAssistantWebSocketClient – constructor URL conversion", () => {
  it("converts http to ws://", () => {
    const client = new HomeAssistantWebSocketClient(baseConfig);
    expect((client as unknown as { wsUrl: string }).wsUrl).toBe("ws://localhost:8123/api/websocket");
  });

  it("converts https to wss://", () => {
    const client = new HomeAssistantWebSocketClient({ ...baseConfig, url: "https://ha.example.com:8123" });
    expect((client as unknown as { wsUrl: string }).wsUrl).toBe("wss://ha.example.com:8123/api/websocket");
  });

  it("strips existing path and search params", () => {
    const client = new HomeAssistantWebSocketClient({ ...baseConfig, url: "http://localhost:8123/path?q=1" });
    expect((client as unknown as { wsUrl: string }).wsUrl).toBe("ws://localhost:8123/api/websocket");
  });
});

// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – parseMessage()", () => {
  const ic = new HomeAssistantWebSocketClient(baseConfig) as unknown as InternalClient;

  it("returns null for invalid JSON", () => {
    expect(ic.parseMessage("not-json")).toBeNull();
  });

  it("returns parsed object for valid JSON", () => {
    expect(ic.parseMessage('{"type":"ping"}')).toEqual({ type: "ping" });
  });

  it("parses empty object", () => {
    expect(ic.parseMessage("{}")).toEqual({});
  });
});

// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – close() without socket", () => {
  it("resolves immediately when socket is null", async () => {
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await expect(client.close()).resolves.toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – waitForMessage() error cases", () => {
  it("rejects when socket is null", async () => {
    const client = new HomeAssistantWebSocketClient(baseConfig);
    const ic = client as unknown as InternalClient;
    ic.socket = null;
    await expect(ic.waitForMessage()).rejects.toThrow("WebSocket not initialized");
  });

  it("times out when no message arrives", async () => {
    const client = new HomeAssistantWebSocketClient(fastConfig);
    const ic = client as unknown as InternalClient;
    ic.socket = new FakeWs(1);
    await expect(ic.waitForMessage()).rejects.toThrow(/timed out/i);
  }, 5000);
});

// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – sendAndWait() error cases", () => {
  it("rejects when socket is null", async () => {
    const client = new HomeAssistantWebSocketClient(baseConfig);
    (client as unknown as InternalClient).socket = null;
    await expect((client as unknown as InternalClient).sendAndWait(1, "ping")).rejects.toThrow("WebSocket not connected");
  });

  it("rejects when socket readyState is CLOSED", async () => {
    const client = new HomeAssistantWebSocketClient(baseConfig);
    (client as unknown as InternalClient).socket = new FakeWs(3);
    await expect((client as unknown as InternalClient).sendAndWait(1, "ping")).rejects.toThrow("WebSocket not connected");
  });

  it("times out when socket is open but no reply arrives", async () => {
    const client = new HomeAssistantWebSocketClient(fastConfig);
    (client as unknown as InternalClient).socket = new FakeWs(1);
    await expect((client as unknown as InternalClient).sendAndWait(99, "ping")).rejects.toThrow(/timed out/i);
  }, 5000);
});

// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – connect()", () => {
  beforeEach(() => {
    mockWsConstructor.mockClear();
    wsHelpers.clearNext();
  });

  it("completes auth handshake and sends access_token", async () => {
    const ws = buildAuthWs();
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await client.connect();

    const authMsg = ws.sentMessages
      .map(m => JSON.parse(m) as Record<string, unknown>)
      .find(m => m["type"] === "auth");
    expect(authMsg?.["access_token"]).toBe("test-token");
    await client.close();
  });

  it("skips reconnect when socket is already OPEN", async () => {
    const ws = buildAuthWs();
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await client.connect();

    const callsBefore = mockWsConstructor.mock.calls.length;
    await client.connect(); // second call — no-op
    expect(mockWsConstructor.mock.calls.length).toBe(callsBefore);
    await client.close();
  });

  it("rejects when auth_invalid is returned", async () => {
    const ws = new FakeWs(1);
    setImmediate(() => {
      ws.emit("open");
      setImmediate(() => {
        ws.emit("message", Buffer.from(JSON.stringify({ type: "auth_required" })));
        setImmediate(() => {
          ws.emit("message", Buffer.from(JSON.stringify({ type: "auth_invalid", message: "bad token" })));
        });
      });
    });
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await expect(client.connect()).rejects.toThrow("bad token");
  });

  it("rejects with fallback error when auth_invalid has no message", async () => {
    const ws = new FakeWs(1);
    setImmediate(() => {
      ws.emit("open");
      setImmediate(() => {
        ws.emit("message", Buffer.from(JSON.stringify({ type: "auth_required" })));
        setImmediate(() => {
          ws.emit("message", Buffer.from(JSON.stringify({ type: "auth_invalid" })));
        });
      });
    });
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await expect(client.connect()).rejects.toThrow("WebSocket authentication failed");
  });

  it("rejects when first message is not auth_required", async () => {
    const ws = new FakeWs(1);
    setImmediate(() => {
      ws.emit("open");
      setImmediate(() => {
        ws.emit("message", Buffer.from(JSON.stringify({ type: "unexpected_type" })));
      });
    });
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await expect(client.connect()).rejects.toThrow("Unexpected WebSocket handshake response");
  });

  it("rejects when WebSocket emits an error event", async () => {
    const ws = new FakeWs(1);
    setImmediate(() => ws.emit("error", new Error("ECONNREFUSED")));
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await expect(client.connect()).rejects.toThrow("ECONNREFUSED");
  });
});

// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – close() with socket", () => {
  beforeEach(() => {
    mockWsConstructor.mockClear();
    wsHelpers.clearNext();
  });

  it("nullifies socket and clears pending maps", async () => {
    const ws = buildAuthWs();
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await client.connect();
    await client.close();

    const ic = client as unknown as InternalClient;
    expect(ic.socket).toBeNull();
    expect(ic.pending.size).toBe(0);
    expect(ic.eventBuffers.size).toBe(0);
  });

  it("resolves immediately on a second close call", async () => {
    const ws = buildAuthWs();
    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    await client.connect();
    await client.close();
    await expect(client.close()).resolves.toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// call() helpers
// ──────────────────────────────────────────────────────────────
async function connectedClient(): Promise<{ client: HomeAssistantWebSocketClient; ws: FakeWs }> {
  const ws = buildAuthWs();
  wsHelpers.setNextWs(ws);
  const client = new HomeAssistantWebSocketClient(baseConfig);
  await client.connect();
  return { client, ws };
}

function hookReply(ws: FakeWs, response: (id: number) => object) {
  const orig = ws.send.bind(ws);
  ws.send = (data: string) => {
    orig(data);
    const msg = JSON.parse(data) as Record<string, unknown>;
    if (msg["type"] !== "auth") {
      setImmediate(() => {
        ws.emit("message", Buffer.from(JSON.stringify({ id: msg["id"], ...response(msg["id"] as number) })));
      });
    }
  };
}

describe("HomeAssistantWebSocketClient – call()", () => {
  beforeEach(() => {
    mockWsConstructor.mockClear();
    wsHelpers.clearNext();
  });

  it("resolves with the result field on success", async () => {
    const { client, ws } = await connectedClient();
    hookReply(ws, (id) => ({ type: "result", success: true, result: { count: 42 }, id }));
    expect(await client.call("config/entity_registry/list")).toEqual({ count: 42 });
    await client.close();
  });

  it("resolves null result correctly", async () => {
    const { client, ws } = await connectedClient();
    hookReply(ws, (id) => ({ type: "result", success: true, result: null, id }));
    expect(await client.call("ping")).toBeNull();
    await client.close();
  });

  it("rejects when server returns success:false with string error", async () => {
    const { client, ws } = await connectedClient();
    hookReply(ws, (id) => ({ type: "result", success: false, error: "not_found", id }));
    await expect(client.call("bad/command")).rejects.toThrow("not_found");
  });

  it("rejects when server returns success:false with object error", async () => {
    const { client, ws } = await connectedClient();
    hookReply(ws, (id) => ({ type: "result", success: false, error: { code: "err_code", message: "bad" }, id }));
    await expect(client.call("bad/command")).rejects.toThrow(/err_code/);
  });

  it("resolves with full response when no result field present", async () => {
    const { client, ws } = await connectedClient();
    hookReply(ws, (id) => ({ type: "result", success: true, id })); // no "result" key
    const resp = await client.call("ping") as Record<string, unknown>;
    expect(resp["type"]).toBe("result");
    expect(resp["success"]).toBe(true);
    await client.close();
  });

  it("ignores messages with unknown pending IDs", async () => {
    const { client, ws } = await connectedClient();
    ws.emit("message", Buffer.from(JSON.stringify({ id: 9999, type: "result", success: true, result: null })));
    await client.close();
  });

  it("forwards payload fields to the wire message", async () => {
    const { client, ws } = await connectedClient();
    hookReply(ws, (id) => ({ type: "result", success: true, result: null, id }));
    await client.call("call_service", { domain: "light", service: "turn_on" });
    const callMsg = ws.sentMessages
      .map(m => JSON.parse(m) as Record<string, unknown>)
      .find(m => m["type"] === "call_service");
    expect(callMsg?.["domain"]).toBe("light");
    expect(callMsg?.["service"]).toBe("turn_on");
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────
// subscribeEvents() – real timers with short waitMs
// ──────────────────────────────────────────────────────────────
describe("HomeAssistantWebSocketClient – subscribeEvents()", () => {
  beforeEach(() => {
    mockWsConstructor.mockClear();
    wsHelpers.clearNext();
  });

  async function setupSubscribedClient(opts?: {
    eventType?: string;
    maxEvents?: number;
    waitMs?: number;
  }): Promise<{
    client: HomeAssistantWebSocketClient;
    ws: FakeWs;
    promise: Promise<unknown[]>;
    deliverEvent: (event: unknown) => void;
  }> {
    let subscribeId: number | undefined;

    const ws = buildAuthWs((socket) => {
      const orig = socket.send.bind(socket);
      socket.send = (data: string) => {
        orig(data);
        const msg = JSON.parse(data) as Record<string, unknown>;
        if (msg["type"] === "subscribe_events") {
          subscribeId = msg["id"] as number;
          setImmediate(() => {
            socket.emit("message", Buffer.from(JSON.stringify({
              id: subscribeId, type: "result", success: true, result: null,
            })));
          });
        } else if (msg["type"] === "unsubscribe_events") {
          setImmediate(() => {
            socket.emit("message", Buffer.from(JSON.stringify({
              id: msg["id"], type: "result", success: true, result: null,
            })));
          });
        }
      };
    });

    wsHelpers.setNextWs(ws);
    const client = new HomeAssistantWebSocketClient(baseConfig);
    const promise = client.subscribeEvents(opts) as Promise<unknown[]>;

    // Yield several times to allow auth handshake + subscribe to complete
    for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));

    function deliverEvent(event: unknown) {
      ws.emit("message", Buffer.from(JSON.stringify({
        id: subscribeId, type: "event", event,
      })));
    }

    return { client, ws, promise, deliverEvent };
  }

  it("returns empty array when no events arrive within waitMs", async () => {
    const { promise } = await setupSubscribedClient({ maxEvents: 5, waitMs: 20 });
    const events = await promise;
    expect(events).toEqual([]);
  });

  it("collects events emitted during the wait window", async () => {
    const { deliverEvent, promise } = await setupSubscribedClient({ maxEvents: 10, waitMs: 50 });
    deliverEvent({ event_type: "state_changed", data: { n: 0 } });
    deliverEvent({ event_type: "state_changed", data: { n: 1 } });
    deliverEvent({ event_type: "state_changed", data: { n: 2 } });
    const events = await promise;
    expect(events).toHaveLength(3);
  });

  it("caps returned events at maxEvents", async () => {
    const { deliverEvent, promise } = await setupSubscribedClient({ maxEvents: 3, waitMs: 50 });
    for (let i = 0; i < 10; i++) deliverEvent({ n: i });
    const events = await promise;
    expect(events).toHaveLength(3);
  });

  it("includes event_type in subscribe message when eventType provided", async () => {
    const { ws, promise } = await setupSubscribedClient({ eventType: "state_changed", waitMs: 20 });
    await promise;
    const sub = ws.sentMessages
      .map(m => JSON.parse(m) as Record<string, unknown>)
      .find(m => m["type"] === "subscribe_events");
    expect(sub?.["event_type"]).toBe("state_changed");
  });

  it("omits event_type when no eventType option is given", async () => {
    const { ws, promise } = await setupSubscribedClient({ waitMs: 20 });
    await promise;
    const sub = ws.sentMessages
      .map(m => JSON.parse(m) as Record<string, unknown>)
      .find(m => m["type"] === "subscribe_events");
    expect(sub?.["event_type"]).toBeUndefined();
  });

  it("uses default maxEvents (10) when not specified", async () => {
    const { deliverEvent, promise } = await setupSubscribedClient({ waitMs: 20 });
    for (let i = 0; i < 15; i++) deliverEvent({ n: i });
    const events = await promise;
    expect(events.length).toBeLessThanOrEqual(10);
  });
});
