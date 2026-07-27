/**
 * Coordinates typed Home Assistant service actions across REST and WebSocket.
 */
import type {
  HaRestServiceCallResult,
  HaService,
  HaWebSocketServiceCallResult,
} from "../types/api.js";
import type { Config } from "../types/options.js";
import { HomeAssistantClient } from "./client.js";
import { HomeAssistantWebSocketClient } from "./websocket.js";

export interface ServiceActionRequest {
  domain: string;
  service: string;
  serviceData: Record<string, unknown>;
  target: Record<string, string[]>;
  returnResponse: boolean;
}

/** Provides schema discovery and lifecycle-safe service-action execution. */
export class HomeAssistantServiceActionClient {
  private readonly rest: HomeAssistantClient;
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
    this.rest = new HomeAssistantClient(config);
  }

  /** Fetch the live service-action catalog used for planning and validation. */
  async getServices(): Promise<HaService[]> {
    return this.rest.getServices();
  }

  /** Execute a service action through Home Assistant's REST API. */
  async executeRest(request: ServiceActionRequest): Promise<HaRestServiceCallResult> {
    return this.rest.callService(
      request.domain,
      request.service,
      { ...request.serviceData, ...request.target },
      request.returnResponse,
    );
  }

  /** Execute a service action over WebSocket and always close the connection. */
  async executeWebSocket(request: ServiceActionRequest): Promise<HaWebSocketServiceCallResult> {
    const websocket = new HomeAssistantWebSocketClient(this.config);
    try {
      return await websocket.callService({
        domain: request.domain,
        service: request.service,
        serviceData: request.serviceData,
        target: request.target,
        returnResponse: request.returnResponse,
      });
    } finally {
      await websocket.close();
    }
  }
}
