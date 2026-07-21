/**
 * Defines the capabilities agent context command surface, options, help, and output behavior.
 */
import { buildAgentPlan, type CapabilityReportSnapshot } from "./capabilities-agent-plan.js";
import { buildAgentProfile } from "./capabilities-agent-profile.js";
import { countSummary } from "./capabilities-summary.js";

interface AgentContextInput extends CapabilityReportSnapshot {
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

export function buildAgentContext(source: "cache" | "live", report: AgentContextInput): Record<string, unknown> {
  const plan = buildAgentPlan(report);
  const profile = buildAgentProfile(report, plan);

  return {
    source,
    checked_at: report.checked_at,
    summary: countSummary(source, report),
    format_contract: {
      default: "toon",
      machine_readable: ["json", "json-compact", "yaml"],
      presentation: ["table", "markdown"],
    },
    profile,
    plan,
    suggested_sequence: profile.planning.fast_path.slice(0, 6),
  };
}
