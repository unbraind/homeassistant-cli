/**
 * Implements typed Home Assistant errors API transport operations.
 */
export interface AgentErrorEnvelope {
  code: string;
  message: string;
  hint: string;
  retriable: boolean;
  statusCode?: number | undefined;
  endpoint?: string | undefined;
  timestamp: string;
}

export class HomeAssistantApiError extends Error {
  public readonly envelope: AgentErrorEnvelope;
  public readonly statusCode: number;
  public readonly body: string;

  constructor(
    message: string,
    statusCode: number,
    body: string,
    endpoint?: string
  ) {
    super(message);
    this.name = "HomeAssistantApiError";
    this.statusCode = statusCode;
    this.body = body;
    
    const retriable = statusCode >= 500 || statusCode === 429;
    const hint = this.generateHint(statusCode, body);
    
    this.envelope = {
      code: this.generateCode(statusCode),
      message,
      hint,
      retriable,
      statusCode,
      endpoint,
      timestamp: new Date().toISOString(),
    };
  }

  private generateCode(statusCode: number): string {
    if (statusCode === 401) return "AUTH_FAILED";
    if (statusCode === 403) return "FORBIDDEN";
    if (statusCode === 404) return "NOT_FOUND";
    if (statusCode === 429) return "RATE_LIMITED";
    if (statusCode >= 500) return "SERVER_ERROR";
    if (statusCode >= 400) return "CLIENT_ERROR";
    return "UNKNOWN_ERROR";
  }

  private generateHint(statusCode: number, _body: string): string {
    if (statusCode === 401) return "Check your HASSIO_TOKEN is valid and not expired";
    if (statusCode === 403) return "Your token lacks required permissions for this operation";
    if (statusCode === 404) return "The requested resource or endpoint does not exist";
    if (statusCode === 429) return "Rate limit exceeded. Wait before retrying";
    if (statusCode >= 500) return "Home Assistant server error. Retry may succeed";
    if (statusCode >= 400) return "Check your request parameters and data format";
    return "An unexpected error occurred";
  }

  toAgentEnvelope(): AgentErrorEnvelope {
    return this.envelope;
  }
}

export class HomeAssistantConnectionError extends Error {
  public readonly envelope: AgentErrorEnvelope;

  constructor(message: string, endpoint?: string) {
    super(message);
    this.name = "HomeAssistantConnectionError";
    
    this.envelope = {
      code: "CONNECTION_FAILED",
      message,
      hint: "Verify Home Assistant URL is correct and the server is running",
      retriable: true,
      endpoint,
      timestamp: new Date().toISOString(),
    };
  }

  toAgentEnvelope(): AgentErrorEnvelope {
    return this.envelope;
  }
}

export class HomeAssistantReadOnlyError extends Error {
  public readonly envelope: AgentErrorEnvelope;

  constructor(method: string, path: string) {
    super(`Read-only mode blocked ${method} /api${path}. Disable read-only mode to allow write operations.`);
    this.name = "HomeAssistantReadOnlyError";
    
    this.envelope = {
      code: "READ_ONLY_MODE",
      message: `Write operation blocked: ${method} /api${path}`,
      hint: "Use --read-only=false or set HASSIO_READONLY=false to enable write operations",
      retriable: false,
      endpoint: `/api${path}`,
      timestamp: new Date().toISOString(),
    };
  }

  toAgentEnvelope(): AgentErrorEnvelope {
    return this.envelope;
  }
}

export class HomeAssistantTimeoutError extends Error {
  public readonly envelope: AgentErrorEnvelope;

  constructor(timeout: number, endpoint?: string) {
    super(`Request timed out after ${timeout}ms`);
    this.name = "HomeAssistantTimeoutError";
    
    this.envelope = {
      code: "TIMEOUT",
      message: `Request exceeded ${timeout}ms timeout`,
      hint: "Increase timeout with --timeout option or check server performance",
      retriable: true,
      endpoint,
      timestamp: new Date().toISOString(),
    };
  }

  toAgentEnvelope(): AgentErrorEnvelope {
    return this.envelope;
  }
}

export function formatErrorForAgent(error: unknown, format: string = 'json'): string {
  if (error instanceof HomeAssistantApiError || 
      error instanceof HomeAssistantConnectionError ||
      error instanceof HomeAssistantReadOnlyError ||
      error instanceof HomeAssistantTimeoutError) {
    const envelope = error.toAgentEnvelope();
    
    if (format === 'json' || format === 'json-compact') {
      return JSON.stringify(envelope, null, format === 'json' ? 2 : 0);
    }
    
    if (format === 'yaml') {
      return formatYaml(envelope);
    }
    
    if (format === 'toon') {
      return formatToon(envelope);
    }
    
    return JSON.stringify(envelope, null, 2);
  }
  
  const genericEnvelope: AgentErrorEnvelope = {
    code: "UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : String(error),
    hint: "An unexpected error occurred. Check logs for details",
    retriable: false,
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(genericEnvelope, null, 2);
}

function formatYaml(envelope: AgentErrorEnvelope): string {
  return `code: ${envelope.code}
message: ${envelope.message}
hint: ${envelope.hint}
retriable: ${envelope.retriable}
${envelope.statusCode ? `statusCode: ${envelope.statusCode}` : ''}
${envelope.endpoint ? `endpoint: ${envelope.endpoint}` : ''}
timestamp: ${envelope.timestamp}`;
}

function formatToon(envelope: AgentErrorEnvelope): string {
  const parts = [
    `code:${envelope.code}`,
    `message:${envelope.message}`,
    `hint:${envelope.hint}`,
    `retriable:${envelope.retriable}`,
  ];
  if (envelope.statusCode) parts.push(`statusCode:${envelope.statusCode}`);
  if (envelope.endpoint) parts.push(`endpoint:${envelope.endpoint}`);
  parts.push(`timestamp:${envelope.timestamp}`);
  return parts.join(',');
}
