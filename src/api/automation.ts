/**
 * Implements typed Home Assistant automation API transport operations.
 */
import type { Config } from "../types/options.js";
import { HomeAssistantClient } from "./client.js";

export interface HaAutomation {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_triggered: string | null;
}

export interface HaScript {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_triggered: string | null;
}

export interface HaScene {
  entity_id: string;
  attributes: Record<string, unknown>;
}

export class AutomationApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getAutomations(): Promise<HaAutomation[]> {
    const states = await this.getStates();
    return states
      .filter(s => s.entity_id.startsWith("automation."))
      .map(s => ({
        entity_id: s.entity_id,
        state: s.state,
        attributes: s.attributes,
        last_triggered: (s.attributes["last_triggered"] as string) || null,
      }));
  }

  async triggerAutomation(entityId: string): Promise<void> {
    await this.callService("automation", "trigger", { entity_id: entityId });
  }

  async toggleAutomation(entityId: string): Promise<void> {
    await this.callService("automation", "toggle", { entity_id: entityId });
  }

  async turnOnAutomation(entityId: string): Promise<void> {
    await this.callService("automation", "turn_on", { entity_id: entityId });
  }

  async turnOffAutomation(entityId: string): Promise<void> {
    await this.callService("automation", "turn_off", { entity_id: entityId });
  }

  async reloadAutomations(): Promise<void> {
    await this.callService("automation", "reload");
  }

  async getScripts(): Promise<HaScript[]> {
    const states = await this.getStates();
    return states
      .filter(s => s.entity_id.startsWith("script."))
      .map(s => ({
        entity_id: s.entity_id,
        state: s.state,
        attributes: s.attributes,
        last_triggered: (s.attributes["last_triggered"] as string) || null,
      }));
  }

  async executeScript(entityId: string, variables?: Record<string, unknown>): Promise<void> {
    await this.callService("script", entityId.replace("script.", ""), variables);
  }

  async reloadScripts(): Promise<void> {
    await this.callService("script", "reload");
  }

  async getScenes(): Promise<HaScene[]> {
    const states = await this.getStates();
    return states
      .filter(s => s.entity_id.startsWith("scene."))
      .map(s => ({
        entity_id: s.entity_id,
        attributes: s.attributes,
      }));
  }

  async applyScene(entityId: string): Promise<void> {
    await this.callService("scene", "turn_on", { entity_id: entityId });
  }

  async reloadScenes(): Promise<void> {
    await this.callService("scene", "reload");
  }
}
