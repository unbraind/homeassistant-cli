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
  private eventBuffers = new Map<number, unknown[]>();

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

    this.socket = new WebSocket(this.wsUrl, { handshakeTimeout: this.timeout });

    await new Promise<void>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("WebSocket not initialized"));
        return;
      }

      const onOpen = () => resolve();
      const onError = (err: Error) => reject(err);
      this.socket.once("open", onOpen);
      this.socket.once("error", onError);
    });

    const authRequired = await this.waitForMessage<WsConnectMessage>();
    if (authRequired.type !== "auth_required") {
      throw new Error(`Unexpected WebSocket handshake response: ${JSON.stringify(authRequired)}`);
    }

    this.socket.send(JSON.stringify({ type: "auth", access_token: this.token }));
    const authResult = await this.waitForMessage<WsConnectMessage>();
    if (authResult.type !== "auth_ok") {
      throw new Error(authResult.message ?? "WebSocket authentication failed");
    }

    this.socket.on("message", (raw: WebSocket.RawData) => {
      const parsed = this.parseMessage(raw.toString());
      if (!parsed) return;

      if (parsed.type === "event" && typeof parsed.id === "number") {
        const events = this.eventBuffers.get(parsed.id);
        if (events) {
          events.push(parsed["event"] ?? parsed);
          return;
        }
      }

      if (typeof parsed.id === "number") {
        const pending = this.pending.get(parsed.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(parsed.id);

        if (parsed.success === false) {
          pending.reject(new Error(typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error)));
          return;
        }

        if ("result" in parsed) {
          pending.resolve(parsed["result"]);
          return;
        }

        pending.resolve(parsed);
      }
    });
  }

  async close(): Promise<void> {
    if (!this.socket) return;
    await new Promise<void>((resolve) => {
      this.socket?.once("close", () => resolve());
      this.socket?.close();
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
    await this.connect();
    const id = this.nextId++;
    const maxEvents = options?.maxEvents ?? 10;
    const waitMs = options?.waitMs ?? 5000;

    this.eventBuffers.set(id, []);
    await this.sendAndWait(id, "subscribe_events", options?.eventType ? { event_type: options.eventType } : undefined);

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    const events = this.eventBuffers.get(id) ?? [];

    try {
      await this.call("unsubscribe_events", { subscription: id });
    } catch {
      // Ignore unsubscribe failures; subscription will be closed on socket close.
    }

    this.eventBuffers.delete(id);
    return events.slice(0, maxEvents);
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

  private parseMessage(raw: string): WsEnvelope | null {
    try {
      return JSON.parse(raw) as WsEnvelope;
    } catch {
      return null;
    }
  }

  private async waitForMessage<T>(): Promise<T> {
    if (!this.socket) {
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
      this.socket?.once("message", onMessage);
    });
  }
}
