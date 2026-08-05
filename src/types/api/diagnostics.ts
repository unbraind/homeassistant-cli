/**
 * Defines type-safe Home Assistant repair and related-resource diagnostics contracts.
 */

export const HA_RELATED_ITEM_TYPES = [
  "area",
  "automation",
  "automation_blueprint",
  "config_entry",
  "device",
  "entity",
  "floor",
  "group",
  "integration",
  "label",
  "person",
  "scene",
  "script",
  "script_blueprint",
] as const;

export type HaRelatedItemType = typeof HA_RELATED_ITEM_TYPES[number];

export type HaRelatedResources = Partial<Record<HaRelatedItemType, string[]>>;

export interface HaRepairIssue {
  breaks_in_ha_version: string | null;
  created: string;
  dismissed_version: string | null;
  ignored: boolean;
  domain: string;
  is_fixable: boolean;
  issue_domain: string | null;
  issue_id: string;
  learn_more_url: string | null;
  severity: string;
  translation_key: string;
  translation_placeholders: Record<string, string> | null;
}

export interface HaRepairIssueList {
  issues: HaRepairIssue[];
}

export interface HaRepairIssueData {
  issue_data: Record<string, unknown>;
}

export interface HaRepairFlowResult {
  type: string;
  flow_id: string;
  handler: string;
  step_id: string;
  data_schema?: Array<Record<string, unknown>>;
  description_placeholders?: Record<string, string>;
  errors?: Record<string, string>;
  last_step?: boolean;
  result?: unknown;
}
