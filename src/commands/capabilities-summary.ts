type CapabilityStatus = "available" | "unavailable" | "unauthorized" | "error";

interface CountSummaryInput {
  checked_at: string;
  api: {
    version: string;
  };
  counts: {
    entity_count: number;
    service_domain_count: number;
    service_count: number;
  };
  capabilities: Record<string, { status: CapabilityStatus }>;
}

export function countSummary(source: "cache" | "live", report: CountSummaryInput): Record<string, unknown> {
  const statuses = Object.values(report.capabilities).reduce((acc, probe) => {
    acc[probe.status] = (acc[probe.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    source,
    checked_at: report.checked_at,
    api_version: report.api.version,
    entity_count: report.counts.entity_count,
    service_domain_count: report.counts.service_domain_count,
    service_count: report.counts.service_count,
    capability_statuses: statuses,
  };
}
