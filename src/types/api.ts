export interface HaConfig {
  components: string[];
  config_dir: string;
  elevation: number;
  latitude: number;
  location_name: string;
  longitude: number;
  time_zone: string;
  unit_system: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
  version: string;
  whitelist_external_dirs: string[];
}

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context?: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HaEvent {
  event: string;
  listener_count: number;
}

export interface HaService {
  domain: string;
  services: string[];
}

export interface HaServiceCallResult {
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
  response?: Record<string, unknown> | null;
}

export interface HaFireEventResult {
  message: string;
  context?: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HaHistoryState {
  entity_id?: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed: string;
  last_updated?: string;
}

export type HaHistoryResponse = HaHistoryState[][];

export interface HaLogbookEntry {
  context_user_id: string | null;
  domain: string;
  entity_id: string | null;
  message: string;
  name: string | null;
  when: string;
}

export interface HaCalendar {
  entity_id: string;
  name: string;
}

export interface HaCalendarEvent {
  summary: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  description?: string;
  location?: string;
}

export interface HaCheckConfigResult {
  errors: string | null;
  result: "valid" | "invalid";
}

export interface HaApiStatus {
  message: string;
}
