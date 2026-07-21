/**
 * Defines type-safe analytics contracts used by the Home Assistant API and CLI.
 */
export interface HaAddonInfo {
  name: string;
  slug: string;
  version: string | null;
}

export interface HaAnalytics {
  active_integrations: string[];
  addons: HaAddonInfo[];
  energy: boolean;
  homeassistant: string;
  installation_type: string;
  integration_count: number;
  state_count: number;
}

export interface HaBackup {
  slug: string;
  name: string;
  date: string;
  size: number;
  location?: string;
  compressed: boolean;
  protected: boolean;
}
