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

// Person types
export interface HaPerson {
  id: string;
  name: string;
  device_trackers: string[];
  user_id?: string | null;
  picture?: string | null;
}

// Zone types
export interface HaZone {
  entity_id: string;
  latitude: number;
  longitude: number;
  radius: number;
  passive: boolean;
  name: string;
  icon?: string | null;
  picture?: string | null;
}

// Entity Registry types
export interface HaEntityRegistryEntry {
  area_id: string | null;
  categories: Record<string, string>;
  config_entry_id: string | null;
  device_id: string | null;
  disabled_by: string | null;
  entity_category: string | null;
  entity_id: string;
  hidden_by: string | null;
  icon: string | null;
  id: string;
  has_entity_name: boolean;
  labels: string[];
  name: string | null;
  options: Record<string, unknown>;
  original_name: string;
  platform: string;
  translation_key: string | null;
  unique_id: string;
}

// Device Registry types
export interface HaDeviceRegistryEntry {
  area_id: string | null;
  configuration_url: string | null;
  config_entries: string[];
  connections: Array<[string, string]>;
  created_at: number;
  disabled_by: string | null;
  entry_type: string | null;
  hw_version: string | null;
  id: string;
  identifiers: Array<[string, string]>;
  labels: string[];
  manufacturer: string | null;
  model: string | null;
  modified_at: number;
  name_by_user: string | null;
  name: string;
  primary_config_entry: string;
  serial_number: string | null;
  sw_version: string | null;
  via_device_id: string | null;
}

// Area Registry types
export interface HaAreaRegistryEntry {
  aliases: string[];
  area_id: string;
  floor_id: string | null;
  humidity_entity_id: string | null;
  icon: string | null;
  labels: string[];
  name: string;
  picture: string | null;
  temperature_entity_id: string | null;
  created_at: number;
  modified_at: number;
}

// Floor Registry types
export interface HaFloorRegistryEntry {
  aliases: string[];
  floor_id: string;
  icon: string | null;
  level: number | null;
  name: string;
  created_at: number;
  modified_at: number;
}

// Label Registry types
export interface HaLabelRegistryEntry {
  color: string | null;
  description: string | null;
  icon: string | null;
  label_id: string;
  name: string;
  created_at: number;
  modified_at: number;
}

// Category Registry types
export interface HaCategoryRegistryEntry {
  category_id: string;
  icon: string | null;
  name: string;
}

// Statistics types
export interface HaStatistics {
  [statisticId: string]: HaStatisticData[];
}

export interface HaStatisticData {
  start: string;
  end: string;
  mean?: number;
  min?: number;
  max?: number;
  last_reset?: string;
  state?: number;
  sum?: number;
}

export interface HaStatisticsDuringPeriod {
  [statisticId: string]: HaStatisticDuringPeriodData[];
}

export interface HaStatisticDuringPeriodData {
  start: string;
  end: string;
  change?: number;
  last_reset?: string;
  max?: number;
  mean?: number;
  min?: number;
  state?: number;
  sum?: number;
}

// Todo List types
export interface HaTodoList {
  entity_id: string;
  name: string;
}

export interface HaTodoItem {
  summary: string;
  uid: string;
  status: "needs_action" | "completed";
  description?: string | null;
  due?: string | null;
}

// Shopping List types
export interface HaShoppingListItem {
  name: string;
  id: string;
  complete: boolean;
}

// Persistent Notification types
export interface HaPersistentNotification {
  message: string;
  notification_id: string;
  title: string;
  created_at: string;
}

// Analytics types
export interface HaAnalytics {
  active_integrations: string[];
  addons: HaAddonInfo[];
  energy: boolean;
  homeassistant: string;
  installation_type: string;
  integration_count: number;
  state_count: number;
  uuid: string;
  version: string;
}

export interface HaAddonInfo {
  name: string;
  slug: string;
  version: string | null;
}

// Backup types
export interface HaBackup {
  slug: string;
  name: string;
  date: string;
  size: number;
  location?: string;
  compressed: boolean;
  protected: boolean;
}

export interface HaEnergyPreferences {
  energy_default_device_capacity: number | null;
  device_consumption: Array<{
    disabled_at: string | null;
    from_entity_id: string | null;
    stat_consumption: string;
    name: string;
    id: string;
  }>;
  device_consumption_from_grid: Array<{
    disabled_at: string | null;
    from_entity_id: string | null;
    stat_consumption: string;
    name: string;
    id: string;
    total_money: string | null;
    entity_energy_from: string | null;
    entity_energy_price: string | null;
    number_energy_price: number | null;
  }>;
  device_production_to_grid: Array<{
    disabled_at: string | null;
    from_entity_id: string | null;
    stat_consumption: string;
    name: string;
    id: string;
    total_money: string | null;
    entity_energy_from: string | null;
    entity_energy_price: string | null;
    number_energy_price: number | null;
  }>;
}

export interface HaWeatherForecast {
  condition: string;
  datetime: string;
  cloud_coverage: number | null;
  humidity: number | null;
  precipitation: number | null;
  precipitation_probability: number | null;
  pressure: number | null;
  temperature: number | null;
  templow: number | null;
  uv_index: number | null;
  wind_bearing: number | null;
  wind_gust_speed: number | null;
  wind_speed: number | null;
}

export interface HaSystemHealth {
  homeassistant: {
    agent_os: boolean;
    healthcheck_failed: boolean;
    install_type: string;
    autologin: boolean;
    virtualenv: boolean;
    python_version: string;
    dev: boolean;
    docker: boolean;
    version: string;
    timezone: string;
    run_in_container: boolean;
    core_sdk: boolean;
    integration_type: string;
  };
}

export interface HaConfigFlow {
  handler: string;
  step_id: string;
  type: string;
  data_schema: Array<{
    name: string;
    required: boolean;
    default: unknown;
    selector: Record<string, unknown> | null;
  }>;
}

export interface HaTileDevice {
  device_id: string;
  name: string;
  area_id: string | null;
  disabled_by: string | null;
  configuration_url: string | null;
  manufacturer: string | null;
  model: string | null;
}
