import { describe, it, expect } from "vitest";
import { flattenServices, getServiceDefinition, getServiceNames } from "../src/utils/services.js";
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
});
