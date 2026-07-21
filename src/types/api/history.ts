/**
 * Defines type-safe history contracts used by the Home Assistant API and CLI.
 */
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
