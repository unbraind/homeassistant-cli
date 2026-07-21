import { describe, it, expect } from "vitest";
import {
  HomeAssistantApiError,
  HomeAssistantConnectionError,
  HomeAssistantReadOnlyError,
  HomeAssistantTimeoutError,
  formatErrorForAgent,
} from "../src/api/errors.js";

describe("HomeAssistantApiError", () => {
  it("sets name, statusCode, body", () => {
    const err = new HomeAssistantApiError("Not found", 404, "missing", "/api/states");
    expect(err.name).toBe("HomeAssistantApiError");
    expect(err.statusCode).toBe(404);
    expect(err.body).toBe("missing");
    expect(err.message).toBe("Not found");
  });

  it("generates correct codes for status codes", () => {
    expect(new HomeAssistantApiError("", 401, "").envelope.code).toBe("AUTH_FAILED");
    expect(new HomeAssistantApiError("", 403, "").envelope.code).toBe("FORBIDDEN");
    expect(new HomeAssistantApiError("", 404, "").envelope.code).toBe("NOT_FOUND");
    expect(new HomeAssistantApiError("", 429, "").envelope.code).toBe("RATE_LIMITED");
    expect(new HomeAssistantApiError("", 500, "").envelope.code).toBe("SERVER_ERROR");
    expect(new HomeAssistantApiError("", 400, "").envelope.code).toBe("CLIENT_ERROR");
    expect(new HomeAssistantApiError("", 301, "").envelope.code).toBe("UNKNOWN_ERROR");
  });

  it("marks 500+ and 429 as retriable", () => {
    expect(new HomeAssistantApiError("", 500, "").envelope.retriable).toBe(true);
    expect(new HomeAssistantApiError("", 429, "").envelope.retriable).toBe(true);
    expect(new HomeAssistantApiError("", 404, "").envelope.retriable).toBe(false);
  });

  it("includes endpoint in envelope", () => {
    const err = new HomeAssistantApiError("fail", 404, "", "/api/states");
    expect(err.envelope.endpoint).toBe("/api/states");
  });

  it("toAgentEnvelope returns the envelope", () => {
    const err = new HomeAssistantApiError("fail", 404, "");
    expect(err.toAgentEnvelope()).toBe(err.envelope);
  });
});

describe("HomeAssistantConnectionError", () => {
  it("sets name and envelope fields", () => {
    const err = new HomeAssistantConnectionError("Connection refused", "/api/");
    expect(err.name).toBe("HomeAssistantConnectionError");
    expect(err.envelope.code).toBe("CONNECTION_FAILED");
    expect(err.envelope.retriable).toBe(true);
    expect(err.envelope.endpoint).toBe("/api/");
    expect(err.toAgentEnvelope()).toBe(err.envelope);
  });
});

describe("HomeAssistantReadOnlyError", () => {
  it("sets name and envelope fields", () => {
    const err = new HomeAssistantReadOnlyError("POST", "/services/light/turn_on");
    expect(err.name).toBe("HomeAssistantReadOnlyError");
    expect(err.envelope.code).toBe("READ_ONLY_MODE");
    expect(err.envelope.retriable).toBe(false);
    expect(err.message).toContain("Read-only mode blocked");
    expect(err.toAgentEnvelope()).toBe(err.envelope);
  });
});

describe("HomeAssistantTimeoutError", () => {
  it("sets name and envelope fields", () => {
    const err = new HomeAssistantTimeoutError(30000, "/api/states");
    expect(err.name).toBe("HomeAssistantTimeoutError");
    expect(err.envelope.code).toBe("TIMEOUT");
    expect(err.envelope.retriable).toBe(true);
    expect(err.message).toContain("30000ms");
    expect(err.toAgentEnvelope()).toBe(err.envelope);
  });
});

describe("formatErrorForAgent", () => {
  const apiErr = new HomeAssistantApiError("Not found", 404, "missing", "/api/states");

  it("formats as json (pretty)", () => {
    const result = formatErrorForAgent(apiErr, "json");
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe("NOT_FOUND");
    expect(result).toContain("\n"); // pretty-printed
  });

  it("formats as json-compact", () => {
    const result = formatErrorForAgent(apiErr, "json-compact");
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe("NOT_FOUND");
    expect(result).not.toContain("\n");
  });

  it("formats as yaml", () => {
    const result = formatErrorForAgent(apiErr, "yaml");
    expect(result).toContain("code: NOT_FOUND");
    expect(result).toContain("retriable: false");
  });

  it("omits absent optional fields from yaml and toon", () => {
    const error = new HomeAssistantConnectionError("offline");
    expect(formatErrorForAgent(error, "yaml")).not.toContain("statusCode:");
    expect(formatErrorForAgent(error, "yaml")).not.toContain("endpoint:");
    expect(formatErrorForAgent(error, "toon")).not.toContain("statusCode:");
    expect(formatErrorForAgent(error, "toon")).not.toContain("endpoint:");
  });

  it("formats as toon", () => {
    const result = formatErrorForAgent(apiErr, "toon");
    expect(result).toContain("code:NOT_FOUND");
    expect(result).toContain("retriable:false");
  });

  it("defaults to json for unknown format", () => {
    const result = formatErrorForAgent(apiErr, "unknown");
    expect(JSON.parse(result).code).toBe("NOT_FOUND");
  });

  it("handles generic Error", () => {
    const result = formatErrorForAgent(new Error("boom"));
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.message).toBe("boom");
  });

  it("handles non-Error values", () => {
    const result = formatErrorForAgent("string error");
    const parsed = JSON.parse(result);
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.message).toBe("string error");
  });
});
