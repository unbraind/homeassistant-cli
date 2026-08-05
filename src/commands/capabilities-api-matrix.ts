/**
 * Defines the capabilities api matrix command surface, options, help, and output behavior.
 */
import { HomeAssistantClient, HomeAssistantWebSocketClient } from "../api/index.js";
import { SupervisorApiClient } from "../api/supervisor.js";
import type { OutputFormat } from "../types/index.js";
import { REST_PROBES, runRestProbe, runWebsocketProbe, WEBSOCKET_PROBES } from "./capabilities-api-probes.js";
import type { CapabilityStatus } from "./capabilities-utils.js";
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
  let websocketCommandEntries: ApiMatrixEntry[];
  const ws = new HomeAssistantWebSocketClient(config);
  try {
    await ws.connect();
    websocketEntry = {
      key: "websocket",
      endpoint: "/api/websocket",
      status: "available",
      command_group: "websocket",
      cli_commands: ["hassio websocket status", "hassio ws observe-entities --domain light"],
      probe: "websocket",
    };
    websocketCommandEntries = await Promise.all(WEBSOCKET_PROBES.map((probe) => runWebsocketProbe(ws, probe)));
  } catch (error) {
    const normalized = normalizeProbeError("/api/websocket", error);
    websocketEntry = {
      key: "websocket",
      endpoint: "/api/websocket",
      status: normalized.status,
      command_group: "websocket",
      cli_commands: ["hassio websocket status", "hassio ws observe-entities --domain light"],
      probe: "websocket",
      message: normalized.message,
    };
    websocketCommandEntries = WEBSOCKET_PROBES.map((probe) => ({
      key: probe.key,
      endpoint: probe.endpoint,
      status: normalized.status,
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "websocket",
      message: normalized.message,
    }));
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
      status: normalized.status,
      command_group: "supervisor",
      cli_commands: ["hassio supervisor addons --list", "hassio supervisor api -m GET -p /addons"],
      probe: "rest",
      message: normalized.message,
    };
  }

  const entries = [
    ...restEntries,
    ...serviceDomainEntries,
    websocketEntry,
    ...websocketCommandEntries,
    supervisorEntry,
  ];
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
    recommendations.push("Prefer ws observe-entities for token-efficient low-latency state deltas.");
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
