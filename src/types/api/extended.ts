/**
 * Defines type-safe extended contracts used by the Home Assistant API and CLI.
 */
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
