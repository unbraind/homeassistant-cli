export type OutputFormat = "toon" | "json" | "json-compact" | "yaml" | "table";

export interface Config {
  url: string;
  token: string;
  outputFormat: OutputFormat;
  timeout: number;
  readOnly: boolean;
}

export interface CliOptions {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  config?: string;
}

export interface EntityFilter {
  entityId?: string;
  domain?: string;
  state?: string;
}

export interface HistoryOptions {
  entityId: string | string[];
  startTime?: string;
  endTime?: string;
  minimalResponse?: boolean;
  noAttributes?: boolean;
  significantChangesOnly?: boolean;
}

export interface LogbookOptions {
  entityId?: string;
  startTime?: string;
  endTime?: string;
}

export interface CalendarEventOptions {
  entityId: string;
  start: string;
  end: string;
}

export interface ServiceCallOptions {
  domain: string;
  service: string;
  entityId?: string;
  data?: Record<string, unknown>;
  returnResponse?: boolean;
}

export interface FireEventOptions {
  eventType: string;
  eventData?: Record<string, unknown>;
}

export interface TemplateOptions {
  template: string;
}

export interface IntentOptions {
  name: string;
  data?: Record<string, unknown>;
}

export interface StateUpdateOptions {
  entityId: string;
  state: string;
  attributes?: Record<string, unknown>;
}
