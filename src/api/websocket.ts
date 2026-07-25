/**
 * Implements typed Home Assistant websocket API transport operations.
 */
import WebSocket from "ws";
import type { Config } from "../types/options.js";

interface WsEnvelope {
  id?: number;
  type?: string;
  success?: boolean;
  error?: unknown;
  [key: string]: unknown;
}

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: NodeJS.Timeout;
}

interface EventBuffer {
  events: unknown[];
  maxEvents: number;
}

interface WsConnectMessage {
  type: "auth_required" | "auth_ok" | "auth_invalid";
  message?: string;
}

export class HomeAssistantWebSocketClient {
  private readonly wsUrl: string;
  private readonly token: string;
  private readonly timeout: number;
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingCall>();
  private eventBuffers = new Map<number, EventBuffer>();

  constructor(config: Config) {
    const parsed = new URL(config.url);
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    parsed.pathname = "/api/websocket";
    parsed.search = "";
    this.wsUrl = parsed.toString();
    this.token = config.token;
    this.timeout = config.timeout;
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(this.wsUrl, { handshakeTimeout: this.timeout });
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => resolve();
      const onError = (err: Error) => reject(err);
      socket.once("open", onOpen);
      socket.once("error", onError);
    });

    const authRequired = await this.waitForMessage<WsConnectMessage>();
    if (authRequired.type !== "auth_required") {
      throw new Error(`Unexpected WebSocket handshake response: ${JSON.stringify(authRequired)}`);
    }

    socket.send(JSON.stringify({ type: "auth", access_token: this.token }));
    const authResult = await this.waitForMessage<WsConnectMessage>();
    if (authResult.type !== "auth_ok") {
      throw new Error(authResult.message ?? "WebSocket authentication failed");
    }

    socket.on("message", (raw: WebSocket.RawData) => {
      const parsed = this.parseMessage(raw.toString());
      if (!parsed) return;
      const messages = Array.isArray(parsed) ? parsed : [parsed];

      for (const message of messages) {
        if (message.type === "event" && typeof message.id === "number") {
          const buffer = this.eventBuffers.get(message.id);
          if (buffer) {
            if (buffer.events.length < buffer.maxEvents) {
              buffer.events.push(message["event"] ?? message);
            }
            continue;
          }
        }

        if (typeof message.id !== "number") continue;
        const pending = this.pending.get(message.id);
        if (!pending) continue;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);

        if (message.success === false) {
          pending.reject(new Error(
            typeof message.error === "string" ? message.error : JSON.stringify(message.error)
          ));
          continue;
        }

        if ("result" in message) {
          pending.resolve(message["result"]);
          continue;
        }

        pending.resolve(message);
      }
    });

    try {
      await this.sendAndWait(this.nextId++, "supported_features", {
        features: { coalesce_messages: 1 },
      });
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    const socket = this.socket;
    if (!socket) return;
    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.close();
      setTimeout(() => resolve(), 250);
    });
    this.socket = null;
    this.pending.clear();
    this.eventBuffers.clear();
  }

  async call(type: string, payload?: Record<string, unknown>): Promise<unknown> {
    await this.connect();
    const id = this.nextId++;
    return this.sendAndWait(id, type, payload);
  }

  async subscribeEvents(options?: {
    eventType?: string;
    maxEvents?: number;
    waitMs?: number;
  }): Promise<unknown[]> {
    const payload = options?.eventType ? { event_type: options.eventType } : undefined;
    return this.collectSubscription(
      "subscribe_events",
      payload,
      options?.maxEvents ?? 10,
      options?.waitMs ?? 5000,
    );
  }

  async subscribeTrigger(options: {
    trigger: Record<string, unknown> | Record<string, unknown>[];
    variables?: Record<string, unknown>;
    maxEvents?: number;
    waitMs?: number;
  }): Promise<unknown[]> {
    const payload: Record<string, unknown> = { trigger: options.trigger };
    if (options.variables) payload["variables"] = options.variables;
    return this.collectSubscription(
      "subscribe_trigger",
      payload,
      options.maxEvents ?? 10,
      options.waitMs ?? 5000,
    );
  }

  private async collectSubscription(
    type: "subscribe_events" | "subscribe_trigger",
    payload: Record<string, unknown> | undefined,
    maxEvents: number,
    waitMs: number,
  ): Promise<unknown[]> {
    await this.connect();
    const id = this.nextId++;
    const buffer: EventBuffer = { events: [], maxEvents };
    this.eventBuffers.set(id, buffer);
    try {
      await this.sendAndWait(id, type, payload);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return buffer.events;
    } finally {
      try {
        await this.call("unsubscribe_events", { subscription: id });
      } catch {
        // Closing the socket also removes a subscription if explicit cleanup fails.
      }
      this.eventBuffers.delete(id);
    }
  }

  private async sendAndWait(id: number, type: string, payload?: Record<string, unknown>): Promise<unknown> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    const msg: Record<string, unknown> = { id, type, ...(payload ?? {}) };

    const response = await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`WebSocket request timed out for type '${type}'`));
      }, this.timeout);

      this.pending.set(id, { resolve, reject, timer });
      this.socket?.send(JSON.stringify(msg));
    });

    return response;
  }

  private parseMessage(raw: string): WsEnvelope | WsEnvelope[] | null {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (value): value is WsEnvelope => value !== null && typeof value === "object" && !Array.isArray(value)
        );
      }
      return parsed !== null && typeof parsed === "object" ? parsed as WsEnvelope : null;
    } catch {
      return null;
    }
  }

  private async waitForMessage<T>(): Promise<T> {
    const socket = this.socket;
    if (!socket) {
      throw new Error("WebSocket not initialized");
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WebSocket handshake timed out")), this.timeout);
      const onMessage = (raw: WebSocket.RawData) => {
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(raw.toString()) as T;
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      };
      socket.once("message", onMessage);
    });
  }
}
