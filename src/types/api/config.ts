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
}

export interface HaConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: string;
  supports_options: boolean;
  supports_remove_device: boolean;
  supports_unload: boolean;
  supports_reconfigure: boolean;
  disabled_by: string | null;
  reason: Record<string, unknown> | null;
  pref_disable_new_entities: boolean;
  pref_disable_polling: boolean;
  created_at: number;
  modified_at: number;
}
