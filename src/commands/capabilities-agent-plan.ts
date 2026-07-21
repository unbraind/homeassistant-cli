/**
 * Defines the capabilities agent plan command surface, options, help, and output behavior.
 */
type CapabilityStatus = "available" | "unavailable" | "unauthorized" | "error";

interface CapabilityProbe {
  status: CapabilityStatus;
  endpoint: string;
  message?: string;
}

export interface CapabilityReportSnapshot {
  hints: string[];
  capabilities: {
    rest_api: CapabilityProbe;
    websocket: CapabilityProbe;
    config_entries: CapabilityProbe;
    supervisor: CapabilityProbe;
    conversation: CapabilityProbe;
    tts: CapabilityProbe;
  };
}

export interface AgentPlan {
  recommended_commands: string[];
  avoid_commands: string[];
  notes: string[];
}

export function buildAgentPlan(report: CapabilityReportSnapshot): AgentPlan {
  const recommendedCommands = [
    "hassio status",
    "hassio summary --format toon",
    "hassio entities --count --format json",
    "hassio capabilities --count --format json",
  ];
  const avoidCommands: string[] = [];
  const notes = [...report.hints];

  if (report.capabilities.websocket.status === "available") {
    recommendedCommands.push("hassio websocket status");
  } else {
    notes.push("WebSocket API is unavailable; prefer REST polling commands.");
  }

  if (report.capabilities.config_entries.status === "available") {
    recommendedCommands.push("hassio config-entries --count --format json");
  } else {
    notes.push("Config entries endpoint is unavailable; avoid config-entry automation.");
  }

  if (report.capabilities.conversation.status === "available") {
    recommendedCommands.push("hassio ask \"<question>\" --format json");
  } else {
    notes.push("Conversation domain unavailable; rely on direct service calls.");
  }

  if (report.capabilities.tts.status === "available") {
    recommendedCommands.push("hassio tts engines --format json");
  }

  if (report.capabilities.supervisor.status !== "available") {
    avoidCommands.push("hassio supervisor addons --list");
    notes.push("Supervisor endpoints are not fully available for this token/installation.");
  } else {
    recommendedCommands.push("hassio supervisor addons --list --format json");
  }

  return {
    recommended_commands: [...new Set(recommendedCommands)],
    avoid_commands: [...new Set(avoidCommands)],
    notes: [...new Set(notes)],
  };
}
