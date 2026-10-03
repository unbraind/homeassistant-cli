/**
 * Implements typed Home Assistant websocket API transport operations.
 */
import WebSocket from "ws";
import type { Config } from "../types/options.js";
import type { HaWebSocketServiceCallResult } from "../types/api.js";
import { HomeAssistantReadOnlyError } from "./errors.js";
import { websocketProxyAgent } from "./websocket-proxy.js";
import { waitForWebSocketMessage } from "./websocket-handshake.js";
import {
  parseWebsocketMessage,
  type EventBuffer,
  type PendingCall,
  type WsConnectMessage,
  type WsSubscriptionType,
} from "./websocket-protocol.js";

export class HomeAssistantWebSocketClient {
  private readonly wsUrl: string;
  private readonly token: string;
  private readonly timeout: number;
  private readonly readOnly: boolean;
  private socket: WebSocket | null = null;
  private proxyAgent: ReturnType<typeof websocketProxyAgent> = false;
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
    this.readOnly = config.readOnly;
  }

  async connect(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      await this.connectSocket();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  private async connectSocket(): Promise<void> {
    this.proxyAgent = websocketProxyAgent(this.wsUrl);
    const socket = new WebSocket(this.wsUrl, {
      handshakeTimeout: this.timeout,
      agent: this.proxyAgent,
    });
    this.socket = socket;
    socket.on("error", (error: Error) => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.pending.clear();
    });

    const authRequired = await waitForWebSocketMessage<WsConnectMessage>(socket, this.timeout);
    if (authRequired.type !== "auth_required") {
      throw new Error(`Unexpected WebSocket handshake response: ${JSON.stringify(authRequired)}`);
    }

    socket.send(JSON.stringify({ type: "auth", access_token: this.token }));
    const authResult = await waitForWebSocketMessage<WsConnectMessage>(socket, this.timeout);
    if (authResult.type !== "auth_ok") {
      throw new Error(authResult.message ?? "WebSocket authentication failed");
    }

    socket.on("message", (raw: WebSocket.RawData) => {
      const parsed = parseWebsocketMessage(raw.toString());
      if (!parsed) return;
      const messages = Array.isArray(parsed) ? parsed : [parsed];

      for (const message of messages) {
        if (message.type === "event" && typeof message.id === "number") {
          const buffer = this.eventBuffers.get(message.id);
          if (buffer) {
            if (buffer.events.length < buffer.maxEvents) {
              buffer.events.push(message["event"] ?? message);
              if (buffer.events.length === buffer.maxEvents) buffer.finish();
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

    await this.sendAndWait(this.nextId++, "supported_features", {
      features: { coalesce_messages: 1 },
    });
  }

  async close(): Promise<void> {
    const socket = this.socket;
    const destroyAgent = () => {
      if (this.proxyAgent) this.proxyAgent.destroy();
      this.proxyAgent = false;
    };
    if (!socket) { destroyAgent(); return; }
    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.once("error", () => resolve());
      socket.close();
      setTimeout(() => resolve(), 250);
    });
    destroyAgent();
    this.socket = null;
    this.pending.clear();
    this.eventBuffers.clear();
  }

  async call(type: string, payload?: Record<string, unknown>): Promise<unknown> {
    await this.connect();
    const id = this.nextId++;
    return this.sendAndWait(id, type, payload);
  }

  /** Execute a service action through the typed WebSocket contract. */
  async callService(options: {
    domain: string;
    service: string;
    serviceData?: Record<string, unknown>;
    target?: Record<string, string[]>;
    returnResponse: boolean;
  }): Promise<HaWebSocketServiceCallResult> {
    if (this.readOnly) {
      throw new HomeAssistantReadOnlyError("WEBSOCKET", "/websocket/call_service");
    }
    const payload: Record<string, unknown> = {
      domain: options.domain,
      service: options.service,
      return_response: options.returnResponse,
    };
    if (options.serviceData && Object.keys(options.serviceData).length > 0) {
      payload["service_data"] = options.serviceData;
    }
    if (options.target && Object.keys(options.target).length > 0) {
      payload["target"] = options.target;
    }
    return await this.call("call_service", payload) as HaWebSocketServiceCallResult;
  }

  /** Execute an ad hoc Home Assistant action sequence through WebSocket. */
  async executeScript(options: {
    sequence: Record<string, unknown> | Record<string, unknown>[];
    variables?: Record<string, unknown>;
  }): Promise<unknown> {
    if (this.readOnly) {
      throw new HomeAssistantReadOnlyError("WEBSOCKET", "/websocket/execute_script");
    }
    const payload: Record<string, unknown> = { sequence: options.sequence };
    if (options.variables) payload["variables"] = options.variables;
    return this.call("execute_script", payload);
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

  /** Collect changed evaluations for one Home Assistant condition. */
  async subscribeCondition(options: {
    condition: Record<string, unknown>;
    maxEvents?: number;
    waitMs?: number;
  }): Promise<unknown[]> {
    return this.collectSubscription(
      "subscribe_condition",
      { condition: options.condition },
      options.maxEvents ?? 10,
      options.waitMs ?? 5000,
    );
  }

  /** Collect compact entity snapshot and delta events from Home Assistant. */
  async subscribeEntities(options: {
    entityIds?: string[];
    includeDomains?: string[];
    excludeEntityIds?: string[];
    excludeDomains?: string[];
    maxEvents?: number;
    waitMs?: number;
  }): Promise<unknown[]> {
    const payload: Record<string, unknown> = {};
    if (options.entityIds?.length) payload["entity_ids"] = options.entityIds;
    if (options.includeDomains?.length) payload["include"] = { domains: options.includeDomains };
    const exclude: Record<string, string[]> = {};
    if (options.excludeEntityIds?.length) exclude["entities"] = options.excludeEntityIds;
    if (options.excludeDomains?.length) exclude["domains"] = options.excludeDomains;
    if (Object.keys(exclude).length) payload["exclude"] = exclude;
    return this.collectSubscription(
      "subscribe_entities",
      payload,
      options.maxEvents ?? 11,
      options.waitMs ?? 5000,
    );
  }

  /** Collect current and newly loaded automation platform descriptions. */
  async subscribeAutomationPlatforms(options: {
    kind: "condition" | "trigger";
    maxEvents?: number;
    waitMs?: number;
  }): Promise<unknown[]> {
    return this.collectSubscription(
      `${options.kind}_platforms/subscribe`,
      undefined,
      options.maxEvents ?? 1,
      options.waitMs ?? 5000,
    );
  }

  /** Collect snapshots of integrations still loading during Home Assistant bootstrap. */
  async subscribeBootstrapIntegrations(options: {
    maxEvents?: number;
    waitMs?: number;
  }): Promise<unknown[]> {
    return this.collectSubscription(
      "subscribe_bootstrap_integrations",
      undefined,
      options.maxEvents ?? 10,
      options.waitMs ?? 5000,
    );
  }

  private async collectSubscription(
    type: WsSubscriptionType,
    payload: Record<string, unknown> | undefined,
    maxEvents: number,
    waitMs: number,
  ): Promise<unknown[]> {
    await this.connect();
    const id = this.nextId++;
    let finish!: () => void;
    const limitReached = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const buffer: EventBuffer = { events: [], maxEvents, finish };
    this.eventBuffers.set(id, buffer);
    let timer: NodeJS.Timeout | undefined;
    try {
      await this.sendAndWait(id, type, payload);
      await Promise.race([
        limitReached,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, waitMs);
        }),
      ]);
      return buffer.events;
    } finally {
      if (timer) clearTimeout(timer);
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

}
