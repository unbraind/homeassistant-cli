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

export interface HaEntityRegistryDisplayEntry {
  ai?: string;
  di?: string;
  dp?: number;
  ec?: number;
  ei: string;
  en?: string;
  hb?: true;
  hn?: true;
  ic?: string;
  lb?: string[];
  pl: string;
  tk?: string;
}

export interface HaEntityRegistryDisplayResponse {
  entities: HaEntityRegistryDisplayEntry[];
  entity_categories: Record<string, string>;
}

export interface HaEntityRegistryDisplayRow {
  area_id?: string;
  device_id?: string;
  display_precision?: number;
  entity_category?: string;
  entity_id: string;
  has_entity_name?: true;
  hidden?: true;
  icon?: string;
  labels?: string[];
  name?: string;
  platform: string;
  translation_key?: string;
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

export interface HaCompositeDeviceSplit {
  primary_id: string | null;
  split_ids: string[];
}

export type HaCompositeDeviceSplits = Record<string, HaCompositeDeviceSplit>;

export interface HaLinkedDevicesResponse {
  linked_devices: string[];
}

export type HaAutomaticEntityIds = Record<string, string | null>;

export type HaEntityNamePart = "area" | "device" | "entity" | "floor";

export interface HaEntityRegistrySettings {
  entity_id_parts: HaEntityNamePart[] | null;
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
