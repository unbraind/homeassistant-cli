/**
 * Defines the capabilities agent profile command surface, options, help, and output behavior.
 */
import type { CapabilityReportSnapshot, AgentPlan } from "./capabilities-agent-plan.js";

type CapabilityStatus = "available" | "unavailable" | "unauthorized" | "error";

interface AgentProfileInput extends CapabilityReportSnapshot {
  checked_at: string;
  api: {
    version: string;
    installation_type: string;
  };
  counts: {
    entity_count: number;
    service_domain_count: number;
    service_count: number;
  };
  service_domains: string[];
}

interface AgentProfile {
  profile_version: string;
  generated_at: string;
  api_version: string;
  installation_type: string;
  preferred_output_format: "toon";
  counts: {
    entities: number;
    service_domains: number;
    services: number;
  };
  capabilities: Record<string, CapabilityStatus>;
  planning: {
    recommended_commands: string[];
    avoid_commands: string[];
    fast_path: string[];
    streaming_ready: boolean;
  };
  available_service_domains: string[];
  notes: string[];
}

function capabilityStatuses(input: AgentProfileInput): Record<string, CapabilityStatus> {
  return {
    rest_api: input.capabilities.rest_api.status,
    websocket: input.capabilities.websocket.status,
    config_entries: input.capabilities.config_entries.status,
    supervisor: input.capabilities.supervisor.status,
    conversation: input.capabilities.conversation.status,
    tts: input.capabilities.tts.status,
  };
}

function buildFastPath(plan: AgentPlan): string[] {
  const preferred = [
    "hassio summary --format toon",
    "hassio capabilities --count --format json",
    "hassio entities --count --format json",
  ];
  const merged = [...preferred, ...plan.recommended_commands];
  return [...new Set(merged)].slice(0, 8);
}

export function buildAgentProfile(input: AgentProfileInput, plan: AgentPlan): AgentProfile {
  const statuses = capabilityStatuses(input);
  return {
    profile_version: "2026-03-02",
    generated_at: input.checked_at,
    api_version: input.api.version,
    installation_type: input.api.installation_type,
    preferred_output_format: "toon",
    counts: {
      entities: input.counts.entity_count,
      service_domains: input.counts.service_domain_count,
      services: input.counts.service_count,
    },
    capabilities: statuses,
    planning: {
      recommended_commands: plan.recommended_commands,
      avoid_commands: plan.avoid_commands,
      fast_path: buildFastPath(plan),
      streaming_ready: statuses["websocket"] === "available",
    },
    available_service_domains: input.service_domains,
    notes: [...new Set([...input.hints, ...plan.notes])],
  };
}
