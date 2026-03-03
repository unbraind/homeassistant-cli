import { describe, it, expect } from "vitest";
import {
  flattenServices,
  getServiceDefinition,
  getServiceNames,
  normalizeServices,
  validateServiceData,
} from "../src/utils/services.js";
import type { HaService } from "../src/types/api.js";

describe("services utils", () => {
  it("returns service names for array-style services", () => {
    expect(getServiceNames(["turn_on", "turn_off"])).toEqual(["turn_on", "turn_off"]);
  });

  it("returns service names for object-style services", () => {
    expect(getServiceNames({ turn_on: {}, turn_off: {} })).toEqual(["turn_on", "turn_off"]);
  });

  it("returns service definition for object-style services", () => {
    const service: HaService = {
      domain: "light",
      services: {
        turn_on: {
          fields: { brightness: {} },
          response: { optional: true },
        },
      },
    };
    expect(getServiceDefinition(service, "turn_on")).toEqual({
      fields: { brightness: {} },
      response: { optional: true },
    });
  });

  it("flattens mixed service schemas", () => {
    const services: HaService[] = [
      {
        domain: "light",
        services: {
          turn_on: {
            fields: { brightness: {}, transition: {} },
          },
          turn_off: {
            fields: {},
            response: { optional: true },
          },
        },
      },
      {
        domain: "switch",
        services: ["turn_on"],
      },
    ];

    expect(flattenServices(services)).toEqual([
      { domain: "light", service: "turn_off", field_count: 0, has_response: true },
      { domain: "light", service: "turn_on", field_count: 2, has_response: false },
      { domain: "switch", service: "turn_on", field_count: 0, has_response: false },
    ]);
  });

  it("normalizes service schemas for agent usage", () => {
    const services: HaService[] = [
      {
        domain: "light",
        services: {
          turn_on: {
            target: {},
            fields: {
              entity_id: { required: false },
              brightness: { required: false },
              transition: { required: true },
            },
          },
        },
      },
    ];

    expect(normalizeServices(services)).toEqual([
      {
        domain: "light",
        service: "turn_on",
        accepts_target: true,
        has_response: false,
        required_fields: ["transition"],
        optional_fields: ["brightness", "entity_id"],
      },
    ]);
  });

  it("validates service data with warnings for unknown keys", () => {
    const validation = validateServiceData(
      {
        fields: {
          entity_id: { required: true },
          brightness: { required: false },
        },
      },
      { entity_id: "light.kitchen", random_field: 1 },
      false
    );
    expect(validation.ok).toBe(true);
    expect(validation.warnings).toContain("Unknown field: 'random_field'");
  });

  it("validates service data strictly", () => {
    const validation = validateServiceData(
      {
        fields: {
          entity_id: { required: true },
          brightness: { required: false },
        },
      },
      { brightness: 42, random_field: 1 },
      true
    );
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("Missing required field: 'entity_id'");
    expect(validation.errors).toContain("Unknown field: 'random_field'");
  });
});
