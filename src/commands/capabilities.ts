import { Command } from "commander";
import { ConfigEntriesApiClient, HomeAssistantClient, HomeAssistantWebSocketClient } from "../api/index.js";
import { SupervisorApiClient } from "../api/supervisor.js";
import { getConfig, getData, saveData } from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";
import { withExit } from "../utils/exit.js";
import { getConfigPathFromCommand, withConfigPath } from "./settings-utils.js";
import { buildAgentPlan } from "./capabilities-agent-plan.js";
import { buildAgentProfile } from "./capabilities-agent-profile.js";
import { countSummary } from "./capabilities-summary.js";
import { buildAgentContext } from "./capabilities-agent-context.js";
import { redactCapabilitiesReport } from "./capabilities-redact.js";
import {
  buildHints,
  countServices,
  normalizeProbeError,
  parseTtlSeconds,
  summarizeEntityDomains,
  type CapabilityProbe,
} from "./capabilities-utils.js";

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
    .option("--agent-context", "Return merged agent payload (summary + plan + profile)")
    .option("--redact-private", "Redact private instance fields (for sharing outputs safely)")
    .action(withExit(async (options: {
      refresh?: boolean;
      ttl?: string;
      count?: boolean;
      agentPlan?: boolean;
      agentProfile?: boolean;
      agentContext?: boolean;
      redactPrivate?: boolean;
    }, cmd) => {
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
      const wantsAgentPayload = options.agentPlan || options.agentProfile || options.agentContext;

      const useCache = !options.refresh && cached && cacheIsFresh(cached, ttlSeconds);
      if (useCache) {
        if (!isCapabilitiesReport(cached.report)) {
          throw new Error("Invalid cached capabilities report shape. Re-run with --refresh.");
        }
        const sharedReport = options.redactPrivate ? redactCapabilitiesReport(cached.report) : cached.report;
        if (options.agentContext) {
          console.log(formatOutput(buildAgentContext("cache", sharedReport), config.outputFormat));
          return;
        }
        const plan = wantsAgentPayload ? buildAgentPlan(sharedReport) : undefined;
        if (plan && (options.agentPlan || options.agentProfile)) {
          const payload: Record<string, unknown> = {
            source: "cache",
            checked_at: sharedReport.checked_at,
          };
          if (options.agentPlan) {
            payload["plan"] = plan;
          }
          if (options.agentProfile) {
            payload["profile"] = buildAgentProfile(sharedReport, plan);
          }
          console.log(formatOutput(payload, config.outputFormat));
          return;
        }
        if (options.count) {
          console.log(formatOutput(countSummary("cache", sharedReport), config.outputFormat));
          return;
        }
        console.log(formatOutput({ source: "cache", report: sharedReport }, config.outputFormat));
        return;
      }

      const report = await probeCapabilities(config);
      saveData({ capabilitiesCache: { checkedAt: report.checked_at, report } }, configPath);
      const sharedReport = options.redactPrivate ? redactCapabilitiesReport(report) : report;

      if (options.agentContext) {
        console.log(formatOutput(buildAgentContext("live", sharedReport), config.outputFormat));
        return;
      }
      const plan = wantsAgentPayload ? buildAgentPlan(sharedReport) : undefined;
      if (plan && (options.agentPlan || options.agentProfile)) {
        const payload: Record<string, unknown> = {
          source: "live",
          checked_at: sharedReport.checked_at,
        };
        if (options.agentPlan) {
          payload["plan"] = plan;
        }
        if (options.agentProfile) {
          payload["profile"] = buildAgentProfile(sharedReport, plan);
        }
        console.log(formatOutput(payload, config.outputFormat));
        return;
      }
      if (options.count) {
        console.log(formatOutput(countSummary("live", sharedReport), config.outputFormat));
        return;
      }
      console.log(formatOutput({ source: "live", report: sharedReport }, config.outputFormat));
    }));
}
