/**
 * Defines type-safe registries contracts used by the Home Assistant API and CLI.
 */
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

export interface HaFloorRegistryEntry {
  aliases: string[];
  floor_id: string;
  icon: string | null;
  level: number | null;
  name: string;
  created_at: number;
  modified_at: number;
}

export interface HaLabelRegistryEntry {
  color: string | null;
  description: string | null;
  icon: string | null;
  label_id: string;
  name: string;
  created_at: number;
  modified_at: number;
}

export interface HaCategoryRegistryEntry {
  category_id: string;
  icon: string | null;
  name: string;
}
