import type { HaService, HaState } from "../types/index.js";
import { getServiceNames } from "../utils/services.js";

export type CapabilityStatus = "available" | "unavailable" | "unauthorized" | "error";

export interface CapabilityProbe {
  status: CapabilityStatus;
  endpoint: string;
  message?: string;
}

interface HintableReport {
  capabilities: {
    websocket: CapabilityProbe;
    supervisor: CapabilityProbe;
    conversation: CapabilityProbe;
  };
}

export function parseTtlSeconds(value?: string): number {
  if (!value) {
    return 900;
  }
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("--ttl must be a positive integer number of seconds");
  }
  return parsed;
}

export function normalizeProbeError(endpoint: string, error: unknown): CapabilityProbe {
  const message = error instanceof Error ? error.message : String(error);
  if (/401/.test(message)) {
    return { status: "unauthorized", endpoint, message };
  }
  if (/404/.test(message)) {
    return { status: "unavailable", endpoint, message };
  }
  return { status: "error", endpoint, message };
}

export function countServices(services: HaService[]): number {
  return services.reduce((acc, serviceDomain) => acc + getServiceNames(serviceDomain.services).length, 0);
}

export function summarizeEntityDomains(states: HaState[]): Record<string, number> {
  const byDomain: Record<string, number> = {};
  for (const state of states) {
    const domain = state.entity_id.split(".")[0] || "unknown";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }
  return byDomain;
}

export function buildHints(report: HintableReport): string[] {
  const hints: string[] = [];
  if (report.capabilities.websocket.status === "available") {
    hints.push("Use websocket subscribe for event streaming and low-latency updates.");
  }
  if (report.capabilities.supervisor.status !== "available") {
    hints.push("Avoid supervisor commands unless running Home Assistant OS/Supervised with proper token scope.");
  }
  if (report.capabilities.conversation.status === "available") {
    hints.push("Natural-language flows are available via 'ask' and 'conversation'.");
  }
  hints.push("Prefer '--format toon' for token-efficient agent workflows.");
  return hints;
}
