/**
 * Defines the capabilities api matrix command surface, options, help, and output behavior.
 */
import { HomeAssistantClient, HomeAssistantWebSocketClient } from "../api/index.js";
import { SupervisorApiClient } from "../api/supervisor.js";
import type { OutputFormat } from "../types/index.js";
import type { CapabilityProbe, CapabilityStatus } from "./capabilities-utils.js";
import { normalizeProbeError } from "./capabilities-utils.js";

interface ProbeConfig {
  url: string;
  token: string;
  outputFormat: OutputFormat;
  timeout: number;
  readOnly: boolean;
}

export interface ApiMatrixEntry {
  key: string;
  endpoint: string;
  status: CapabilityStatus;
  command_group: string;
  cli_commands: string[];
  probe: "rest" | "websocket" | "service-domain";
  message?: string | undefined;
}

interface ApiMatrixPayload {
  source: "live";
  checked_at: string;
  summary: Record<CapabilityStatus, number> & { total: number };
  entries: ApiMatrixEntry[];
  recommendations: string[];
}

interface ServiceDomainProbe {
  key: string;
  endpoint: string;
  commandGroup: string;
  commands: string[];
  domain: string;
}

interface RestProbe {
  key: string;
  endpoint: string;
  commandGroup: string;
  commands: string[];
  check: (client: HomeAssistantClient, sampleEntityId?: string) => Promise<unknown>;
}

const REST_PROBES: RestProbe[] = [
  {
    key: "status",
    endpoint: "/api/",
    commandGroup: "core",
    commands: ["hassio status"],
    check: async (client) => client.getStatus(),
  },
  {
    key: "config",
    endpoint: "/api/config",
    commandGroup: "core",
    commands: ["hassio config"],
    check: async (client) => client.getConfig(),
  },
  {
    key: "components",
    endpoint: "/api/components",
    commandGroup: "core",
    commands: ["hassio components"],
    check: async (client) => client.getComponents(),
  },
  {
    key: "events",
    endpoint: "/api/events",
    commandGroup: "core",
    commands: ["hassio events"],
    check: async (client) => client.getEvents(),
  },
  {
    key: "services",
    endpoint: "/api/services",
    commandGroup: "services",
    commands: ["hassio services", "hassio call-service <domain> <service>"],
    check: async (client) => client.getServices(),
  },
  {
    key: "states",
    endpoint: "/api/states",
    commandGroup: "states",
    commands: ["hassio states", "hassio discover", "hassio summary"],
    check: async (client) => client.getStates(),
  },
  {
    key: "history",
    endpoint: "/api/history/period",
    commandGroup: "history",
    commands: ["hassio history -e <entity_id>"],
    check: async (client, sampleEntityId) => sampleEntityId
      ? client.getHistory({ entityId: sampleEntityId, minimalResponse: true })
      : [],
  },
  {
    key: "logbook",
    endpoint: "/api/logbook",
    commandGroup: "history",
    commands: ["hassio logbook"],
    check: async (client) => client.getLogbook(),
  },
  {
    key: "template",
    endpoint: "/api/template",
    commandGroup: "services",
    commands: ["hassio render-template \"{{ 1 + 1 }}\""],
    check: async (client) => client.renderTemplate("{{ 1 + 1 }}"),
  },
  {
    key: "calendars",
    endpoint: "/api/calendars",
    commandGroup: "media",
    commands: ["hassio calendars", "hassio calendar-events <calendar> -s <start> -e <end>"],
    check: async (client) => client.getCalendars(),
  },
];

const SERVICE_DOMAIN_PROBES: ServiceDomainProbe[] = [
  {
    key: "conversation",
    endpoint: "/api/services/conversation/process",
    commandGroup: "conversation",
    commands: ["hassio ask \"<question>\"", "hassio conversation -t \"<text>\""],
    domain: "conversation",
  },
  {
    key: "tts",
    endpoint: "/api/services/tts",
    commandGroup: "tts",
    commands: ["hassio tts --engines", "hassio say \"<message>\" -p <player>"],
    domain: "tts",
  },
  {
    key: "notify",
    endpoint: "/api/services/notify",
    commandGroup: "notify",
    commands: ["hassio notify <service> -m \"<message>\""],
    domain: "notify",
  },
];

function statusFromProbe(probe: CapabilityProbe): ApiMatrixEntry["status"] {
  return probe.status;
}

async function runRestProbe(
  client: HomeAssistantClient,
  probe: RestProbe,
  sampleEntityId?: string
): Promise<ApiMatrixEntry> {
  try {
    await probe.check(client, sampleEntityId);
    return {
      key: probe.key,
      endpoint: probe.endpoint,
      status: "available",
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "rest",
    };
  } catch (error) {
    const normalized = normalizeProbeError(probe.endpoint, error);
    return {
      key: probe.key,
      endpoint: probe.endpoint,
      status: statusFromProbe(normalized),
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "rest",
      message: normalized.message,
    };
  }
}

export async function probeApiMatrix(config: ProbeConfig): Promise<ApiMatrixPayload> {
  const client = new HomeAssistantClient(config);
  const states = await client.getStates();
  const sampleEntityId = states[0]?.entity_id;
  const services = await client.getServices();
  const serviceDomains = new Set(services.map((service) => service.domain));

  const restEntries = await Promise.all(REST_PROBES.map((probe) => runRestProbe(client, probe, sampleEntityId)));

  const serviceDomainEntries: ApiMatrixEntry[] = SERVICE_DOMAIN_PROBES.map((probe) => ({
    key: probe.key,
    endpoint: probe.endpoint,
    status: serviceDomains.has(probe.domain) ? "available" : "unavailable",
    command_group: probe.commandGroup,
    cli_commands: probe.commands,
    probe: "service-domain",
  }));

  let websocketEntry: ApiMatrixEntry;
  const ws = new HomeAssistantWebSocketClient(config);
  try {
    await ws.connect();
    websocketEntry = {
      key: "websocket",
      endpoint: "/api/websocket",
      status: "available",
      command_group: "websocket",
      cli_commands: ["hassio websocket status", "hassio ws subscribe --event-type state_changed"],
      probe: "websocket",
    };
  } catch (error) {
    const normalized = normalizeProbeError("/api/websocket", error);
    websocketEntry = {
      key: "websocket",
      endpoint: "/api/websocket",
      status: statusFromProbe(normalized),
      command_group: "websocket",
      cli_commands: ["hassio websocket status", "hassio ws subscribe --event-type state_changed"],
      probe: "websocket",
      message: normalized.message,
    };
  } finally {
    await ws.close();
  }

  let supervisorEntry: ApiMatrixEntry;
  try {
    const supervisor = new SupervisorApiClient(config);
    await supervisor.getAddons();
    supervisorEntry = {
      key: "supervisor",
      endpoint: "/api/hassio/addons",
      status: "available",
      command_group: "supervisor",
      cli_commands: ["hassio supervisor addons --list", "hassio supervisor api -m GET -p /addons"],
      probe: "rest",
    };
  } catch (error) {
    const normalized = normalizeProbeError("/api/hassio/addons", error);
    supervisorEntry = {
      key: "supervisor",
      endpoint: "/api/hassio/addons",
      status: statusFromProbe(normalized),
      command_group: "supervisor",
      cli_commands: ["hassio supervisor addons --list", "hassio supervisor api -m GET -p /addons"],
      probe: "rest",
      message: normalized.message,
    };
  }

  const entries = [...restEntries, ...serviceDomainEntries, websocketEntry, supervisorEntry];
  const summary = entries.reduce<ApiMatrixPayload["summary"]>(
    (acc, entry) => {
      acc.total += 1;
      acc[entry.status] += 1;
      return acc;
    },
    { total: 0, available: 0, unavailable: 0, unauthorized: 0, error: 0 }
  );

  const recommendations: string[] = [];
  if (websocketEntry.status === "available") {
    recommendations.push("Prefer websocket subscriptions for low-latency state/event streaming.");
  }
  if (supervisorEntry.status !== "available") {
    recommendations.push("Skip supervisor commands unless running HA OS/Supervised with proper token scope.");
  }
  if (!serviceDomains.has("conversation")) {
    recommendations.push("Avoid natural-language ask/conversation flows; conversation domain not detected.");
  }
  recommendations.push("Use --format toon for token-efficient agent workflows.");

  return {
    source: "live",
    checked_at: new Date().toISOString(),
    summary,
    entries,
    recommendations,
  };
}
