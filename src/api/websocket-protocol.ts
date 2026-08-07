/**
 * Defines internal Home Assistant WebSocket message and subscription contracts.
 */
export interface WsEnvelope {
  id?: number;
  type?: string;
  success?: boolean;
  error?: unknown;
  [key: string]: unknown;
}

export interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: NodeJS.Timeout;
}

export interface EventBuffer {
  events: unknown[];
  maxEvents: number;
  finish: () => void;
}

export type WsSubscriptionType =
  | "condition_platforms/subscribe"
  | "subscribe_bootstrap_integrations"
  | "subscribe_condition"
  | "subscribe_entities"
  | "subscribe_events"
  | "subscribe_trigger"
  | "trigger_platforms/subscribe";

export interface WsConnectMessage {
  type: "auth_required" | "auth_ok" | "auth_invalid";
  message?: string;
}

/** Parse one ordinary or coalesced WebSocket frame without throwing. */
export function parseWebsocketMessage(raw: string): WsEnvelope | WsEnvelope[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (value): value is WsEnvelope => value !== null && typeof value === "object" && !Array.isArray(value),
      );
    }
    return parsed !== null && typeof parsed === "object" ? parsed as WsEnvelope : null;
  } catch {
    return null;
  }
}
