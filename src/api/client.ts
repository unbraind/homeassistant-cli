import type {
  HaApiStatus,
  HaCalendar,
  HaCalendarEvent,
  HaCheckConfigResult,
  HaConfig,
  HaEvent,
  HaFireEventResult,
  HaHistoryResponse,
  HaLogbookEntry,
  HaService,
  HaServiceCallResult,
  HaState,
} from "../types/api.js";
import { BaseClient } from "./base.js";
import { HomeAssistantApiError, HomeAssistantConnectionError, HomeAssistantReadOnlyError } from "./errors.js";

export { HomeAssistantApiError, HomeAssistantConnectionError, HomeAssistantReadOnlyError };

export class HomeAssistantClient extends BaseClient {
  async getStatus(): Promise<HaApiStatus> {
    return this.request<HaApiStatus>("GET", "/");
  }

  async getConfig(): Promise<HaConfig> {
    return this.request<HaConfig>("GET", "/config");
  }

  async getComponents(): Promise<string[]> {
    return this.request<string[]>("GET", "/components");
  }

  async getEvents(): Promise<HaEvent[]> {
    return this.request<HaEvent[]>("GET", "/events");
  }

  async getServices(): Promise<HaService[]> {
    return this.request<HaService[]>("GET", "/services");
  }

  async getStates(): Promise<HaState[]> {
    return this.request<HaState[]>("GET", "/states");
  }

  async getState(entityId: string): Promise<HaState> {
    return this.request<HaState>("GET", `/states/${entityId}`);
  }

  async setState(
    entityId: string,
    state: string,
    attributes?: Record<string, unknown>
  ): Promise<HaState> {
    return this.request<HaState>("POST", `/states/${entityId}`, {
      state,
      attributes,
    });
  }

  async deleteState(entityId: string): Promise<void> {
    await this.request<void>("DELETE", `/states/${entityId}`);
  }

  async callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    returnResponse = false
  ): Promise<HaServiceCallResult> {
    const path = returnResponse
      ? `/services/${domain}/${service}?return_response`
      : `/services/${domain}/${service}`;
    return this.request<HaServiceCallResult>("POST", path, data);
  }

  async fireEvent(
    eventType: string,
    eventData?: Record<string, unknown>
  ): Promise<HaFireEventResult> {
    return this.request<HaFireEventResult>(
      "POST",
      `/events/${eventType}`,
      eventData
    );
  }

  async getHistory(options: {
    entityId: string | string[];
    startTime?: string;
    endTime?: string;
    minimalResponse?: boolean;
    noAttributes?: boolean;
    significantChangesOnly?: boolean;
  }): Promise<HaHistoryResponse> {
    const params = new URLSearchParams();
    const entities = Array.isArray(options.entityId)
      ? options.entityId.join(",")
      : options.entityId;
    params.set("filter_entity_id", entities);

    if (options.endTime) params.set("end_time", options.endTime);
    if (options.minimalResponse) params.set("minimal_response", "");
    if (options.noAttributes) params.set("no_attributes", "");
    if (options.significantChangesOnly) params.set("significant_changes_only", "");

    const timePath = options.startTime ? `/${options.startTime}` : "";
    return this.request<HaHistoryResponse>(
      "GET",
      `/history/period${timePath}?${params.toString()}`
    );
  }

  async getLogbook(options?: {
    entityId?: string;
    startTime?: string;
    endTime?: string;
  }): Promise<HaLogbookEntry[]> {
    const params = new URLSearchParams();
    if (options?.entityId) params.set("entity", options.entityId);
    if (options?.endTime) params.set("end_time", options.endTime);

    const timePath = options?.startTime ? `/${options.startTime}` : "";
    const query = params.toString() ? `?${params.toString()}` : "";

    return this.request<HaLogbookEntry[]>("GET", `/logbook${timePath}${query}`);
  }

  async getErrorLog(): Promise<string> {
    return this.requestText("/error_log");
  }

  async renderTemplate(template: string): Promise<string> {
    return this.requestText("/template", { template });
  }

  async getCalendars(): Promise<HaCalendar[]> {
    return this.request<HaCalendar[]>("GET", "/calendars");
  }

  async getCalendarEvents(
    entityId: string,
    start: string,
    end: string
  ): Promise<HaCalendarEvent[]> {
    const params = new URLSearchParams({ start, end });
    return this.request<HaCalendarEvent[]>(
      "GET",
      `/calendars/${entityId}?${params.toString()}`
    );
  }

  async getCameraImage(entityId: string): Promise<Buffer> {
    return this.requestBuffer(`/camera_proxy/${entityId}?time=${Date.now()}`);
  }

  async checkConfig(): Promise<HaCheckConfigResult> {
    return this.request<HaCheckConfigResult>("POST", "/config/core/check_config");
  }

  async handleIntent(
    name: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request("POST", "/intent/handle", { name, data });
  }

  async restartHomeAssistant(): Promise<void> {
    await this.callService("homeassistant", "restart");
  }

  async stopHomeAssistant(): Promise<void> {
    await this.callService("homeassistant", "stop");
  }

  async savePersistentStates(): Promise<void> {
    await this.callService("homeassistant", "save_persistent_states");
  }

  async reloadCoreConfig(): Promise<void> {
    await this.callService("homeassistant", "reload_core_config");
  }

  async reloadAll(): Promise<void> {
    await this.callService("homeassistant", "reload_all");
  }
}
