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
