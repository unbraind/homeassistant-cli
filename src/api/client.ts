import { request } from "undici";
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
import type { Config } from "../types/options.js";

export class HomeAssistantApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "HomeAssistantApiError";
  }
}

export class HomeAssistantClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor(config: Config) {
    this.baseUrl = config.url;
    this.token = config.token;
    this.timeout = config.timeout;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const response = await request(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      throwOnError: true,
    });

    const responseText = await response.body.text();

    if (response.statusCode >= 400) {
      throw new HomeAssistantApiError(
        `API request failed: ${response.statusCode}`,
        response.statusCode,
        responseText
      );
    }

    if (!responseText || responseText.trim() === "") {
      return undefined as T;
    }

    return JSON.parse(responseText) as T;
  }

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

    if (options.endTime) {
      params.set("end_time", options.endTime);
    }
    if (options.minimalResponse) {
      params.set("minimal_response", "");
    }
    if (options.noAttributes) {
      params.set("no_attributes", "");
    }
    if (options.significantChangesOnly) {
      params.set("significant_changes_only", "");
    }

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

    if (options?.entityId) {
      params.set("entity", options.entityId);
    }
    if (options?.endTime) {
      params.set("end_time", options.endTime);
    }

    const timePath = options?.startTime ? `/${options.startTime}` : "";
    const query = params.toString() ? `?${params.toString()}` : "";

    return this.request<HaLogbookEntry[]>("GET", `/logbook${timePath}${query}`);
  }

  async getErrorLog(): Promise<string> {
    const url = `${this.baseUrl}/api/error_log`;
    const response = await request(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    return response.body.text() as Promise<string>;
  }

  async renderTemplate(template: string): Promise<string> {
    const url = `${this.baseUrl}/api/template`;
    const response = await request(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template }),
    });

    return response.body.text() as Promise<string>;
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
    const url = `${this.baseUrl}/api/camera_proxy/${entityId}?time=${Date.now()}`;
    const response = await request(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    const arrayBuffer = await response.body.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async checkConfig(): Promise<HaCheckConfigResult> {
    return this.request<HaCheckConfigResult>(
      "POST",
      "/config/core/check_config"
    );
  }

  async handleIntent(
    name: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    return this.request("POST", "/intent/handle", { name, data });
  }
}
