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
  country?: string;
  language?: string;
  state?: string;
  installation_type?: string;
  config_source?: string;
  safe_mode?: boolean;
  recovery_mode?: boolean;
  internal_url?: string | null;
  external_url?: string | null;
  radius?: number;
  debug?: boolean;
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

export interface HaCheckConfigResult {
  errors: string | null;
  result: "valid" | "invalid";
}

export interface HaApiStatus {
  message: string;
}
