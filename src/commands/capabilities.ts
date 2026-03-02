import { Command } from "commander";
import { ConfigEntriesApiClient, HomeAssistantClient, HomeAssistantWebSocketClient } from "../api/index.js";
import { SupervisorApiClient } from "../api/supervisor.js";
import { getConfig, getData, saveData } from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import type { HaService, HaState, OutputFormat } from "../types/index.js";
import { getServiceNames } from "../utils/services.js";
import { withExit } from "../utils/exit.js";
import { getConfigPathFromCommand, withConfigPath } from "./settings-utils.js";
import { buildAgentPlan } from "./capabilities-agent-plan.js";
import { buildAgentProfile } from "./capabilities-agent-profile.js";
import { countSummary } from "./capabilities-summary.js";

type CapabilityStatus = "available" | "unavailable" | "unauthorized" | "error";

interface CapabilityProbe {
  status: CapabilityStatus;
  endpoint: string;
  message?: string;
}

interface CapabilitiesReport {
  checked_at: string;
  api: {
    version: string;
    location: string;
    installation_type: string;
  };
  counts: {
    entity_count: number;
    service_domain_count: number;
    service_count: number;
    config_entry_count?: number;
  };
  service_domains: string[];
  entity_domains: Record<string, number>;
  capabilities: {
    rest_api: CapabilityProbe;
    websocket: CapabilityProbe;
    config_entries: CapabilityProbe;
    supervisor: CapabilityProbe;
    conversation: CapabilityProbe;
    tts: CapabilityProbe;
  };
  hints: string[];
}

interface CapabilitiesCache {
  checkedAt: string;
  report: unknown;
}

function parseTtlSeconds(value?: string): number {
  if (!value) {
    return 900;
  }
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("--ttl must be a positive integer number of seconds");
  }
  return parsed;
}

function normalizeProbeError(endpoint: string, error: unknown): CapabilityProbe {
  const message = error instanceof Error ? error.message : String(error);
  if (/401/.test(message)) {
    return { status: "unauthorized", endpoint, message };
  }
  if (/404/.test(message)) {
    return { status: "unavailable", endpoint, message };
  }
  return { status: "error", endpoint, message };
}

function countServices(services: HaService[]): number {
  return services.reduce((acc, serviceDomain) => acc + getServiceNames(serviceDomain.services).length, 0);
}

function summarizeEntityDomains(states: HaState[]): Record<string, number> {
  const byDomain: Record<string, number> = {};
  for (const state of states) {
    const domain = state.entity_id.split(".")[0] || "unknown";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }
  return byDomain;
}

function buildHints(report: CapabilitiesReport): string[] {
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

function getCachedReport(data: Partial<{ capabilitiesCache: CapabilitiesCache }>): CapabilitiesCache | undefined {
  const cache = data.capabilitiesCache;
  if (!cache || typeof cache.checkedAt !== "string" || !cache.report) {
    return undefined;
  }
  return cache;
}

function isCapabilitiesReport(value: unknown): value is CapabilitiesReport {
  if (!value || typeof value !== "object") {
    return false;
  }
  const report = value as Partial<CapabilitiesReport>;
  return (
    typeof report.checked_at === "string" &&
    typeof report.api?.version === "string" &&
    typeof report.counts?.entity_count === "number" &&
    typeof report.capabilities?.rest_api?.status === "string"
  );
}

function cacheIsFresh(cache: CapabilitiesCache, ttlSeconds: number): boolean {
  const checkedAt = Date.parse(cache.checkedAt);
  if (!Number.isFinite(checkedAt)) {
    return false;
  }
  return Date.now() - checkedAt <= ttlSeconds * 1000;
}

async function probeCapabilities(config: { url: string; token: string; outputFormat: OutputFormat; timeout: number; readOnly: boolean }): Promise<CapabilitiesReport> {
  const client = new HomeAssistantClient(config);
  const [status, haConfig, services, states] = await Promise.all([
    client.getStatus(),
    client.getConfig(),
    client.getServices(),
    client.getStates(),
  ]);

  const restApi: CapabilityProbe = {
    status: status.message.toLowerCase().includes("running") ? "available" : "error",
    endpoint: "/api/",
    message: status.message,
  };

  let websocket: CapabilityProbe = { status: "error", endpoint: "/api/websocket" };
  const ws = new HomeAssistantWebSocketClient(config);
  try {
    await ws.connect();
    websocket = { status: "available", endpoint: "/api/websocket" };
  } catch (error) {
    websocket = normalizeProbeError("/api/websocket", error);
  } finally {
    await ws.close();
  }

  let configEntries: CapabilityProbe = { status: "error", endpoint: "/api/config/config_entries/entry" };
  let configEntryCount: number | undefined;
  try {
    const entriesClient = new ConfigEntriesApiClient(config);
    const entries = await entriesClient.getConfigEntries();
    configEntryCount = entries.length;
    configEntries = { status: "available", endpoint: "/api/config/config_entries/entry" };
  } catch (error) {
    configEntries = normalizeProbeError("/api/config/config_entries/entry", error);
  }

  let supervisor: CapabilityProbe = { status: "error", endpoint: "/api/hassio/addons" };
  try {
    const supervisorClient = new SupervisorApiClient(config);
    await supervisorClient.getAddons();
    supervisor = { status: "available", endpoint: "/api/hassio/addons" };
  } catch (error) {
    supervisor = normalizeProbeError("/api/hassio/addons", error);
  }

  const serviceDomains = [...new Set(services.map((service) => service.domain))].sort((a, b) => a.localeCompare(b));
  const conversationProbe: CapabilityProbe = serviceDomains.includes("conversation")
    ? { status: "available", endpoint: "/api/services/conversation/process" }
    : { status: "unavailable", endpoint: "/api/services/conversation/process" };

  const ttsProbe: CapabilityProbe = serviceDomains.includes("tts")
    ? { status: "available", endpoint: "/api/services/tts" }
    : { status: "unavailable", endpoint: "/api/services/tts" };

  const capabilities = {
    rest_api: restApi,
    websocket,
    config_entries: configEntries,
    supervisor,
    conversation: conversationProbe,
    tts: ttsProbe,
  };

  const report: CapabilitiesReport = {
    checked_at: new Date().toISOString(),
    api: {
      version: haConfig.version,
      location: haConfig.location_name,
      installation_type: haConfig.installation_type ?? "unknown",
    },
    counts: {
      entity_count: states.length,
      service_domain_count: serviceDomains.length,
      service_count: countServices(services),
      ...(configEntryCount !== undefined ? { config_entry_count: configEntryCount } : {}),
    },
    service_domains: serviceDomains,
    entity_domains: summarizeEntityDomains(states),
    capabilities,
    hints: [],
  };
  report.hints = buildHints(report);
  return report;
}

export function createCapabilitiesCommand(): Command {
  return new Command("capabilities")
    .description("Probe and cache Home Assistant feature capabilities for agent planning")
    .option("--refresh", "Ignore cache and run live probe")
    .option("--ttl <seconds>", "Cache TTL in seconds (default: 900)")
    .option("--count", "Return only summary counts")
    .option("--agent-plan", "Return agent/LLM command recommendations from capability report")
    .option("--agent-profile", "Return structured execution profile for agents/LLMs")
    .action(withExit(async (options: { refresh?: boolean; ttl?: string; count?: boolean; agentPlan?: boolean; agentProfile?: boolean }, cmd) => {
      const configPath = getConfigPathFromCommand(cmd as Command);
      const globalOpts = (cmd as Command).optsWithGlobals() as {
        url?: string;
        token?: string;
        format?: OutputFormat;
        timeout?: number;
        readOnly?: boolean | string;
      };
      const config = getConfig({ ...globalOpts, ...withConfigPath(configPath) });
      const ttlSeconds = parseTtlSeconds(options.ttl);
      const runtimeData = getData(configPath);
      const cached = getCachedReport(runtimeData);

      const useCache = !options.refresh && cached && cacheIsFresh(cached, ttlSeconds);
      if (useCache) {
        if (!isCapabilitiesReport(cached.report)) {
          throw new Error("Invalid cached capabilities report shape. Re-run with --refresh.");
        }
        const plan = options.agentPlan || options.agentProfile ? buildAgentPlan(cached.report) : undefined;
        if (plan) {
          const payload: Record<string, unknown> = {
            source: "cache",
            checked_at: cached.report.checked_at,
          };
          if (options.agentPlan) {
            payload["plan"] = plan;
          }
          if (options.agentProfile) {
            payload["profile"] = buildAgentProfile(cached.report, plan);
          }
          console.log(formatOutput(payload, config.outputFormat));
          return;
        }
        if (options.count) {
          console.log(formatOutput(countSummary("cache", cached.report), config.outputFormat));
          return;
        }
        console.log(formatOutput({ source: "cache", report: cached.report }, config.outputFormat));
        return;
      }

      const report = await probeCapabilities(config);
      saveData({ capabilitiesCache: { checkedAt: report.checked_at, report } }, configPath);

      const plan = options.agentPlan || options.agentProfile ? buildAgentPlan(report) : undefined;
      if (plan) {
        const payload: Record<string, unknown> = {
          source: "live",
          checked_at: report.checked_at,
        };
        if (options.agentPlan) {
          payload["plan"] = plan;
        }
        if (options.agentProfile) {
          payload["profile"] = buildAgentProfile(report, plan);
        }
        console.log(formatOutput(payload, config.outputFormat));
        return;
      }
      if (options.count) {
        console.log(formatOutput(countSummary("live", report), config.outputFormat));
        return;
      }
      console.log(formatOutput({ source: "live", report }, config.outputFormat));
    }));
}
