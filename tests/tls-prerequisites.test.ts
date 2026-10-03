import { describe, expect, it } from "vitest";
import { canRunOpenSslTests } from "./helpers/tls-prerequisites.js";

describe("TLS fixture prerequisites", () => {
  it("runs with working OpenSSL locally and in CI", () => {
    expect(canRunOpenSslTests({ status: 0 }, false)).toBe(true);
    expect(canRunOpenSslTests({ status: 0 }, true)).toBe(true);
  });
  it("allows only missing local OpenSSL to skip", () => {
    expect(canRunOpenSslTests({ status: null, error: { code: "ENOENT", name: "Error", message: "missing" } }, false)).toBe(false);
  });
  it("requires OpenSSL in CI", () => {
    expect(() => canRunOpenSslTests({ status: null, error: { code: "ENOENT", name: "Error", message: "missing" } }, true)).toThrow("OpenSSL is required");
  });
  it("fails broken installations rather than silently skipping coverage", () => {
    expect(() => canRunOpenSslTests({ status: 1 }, false)).toThrow("OpenSSL is required");
    expect(() => canRunOpenSslTests({ status: null, error: { code: "EACCES", name: "Error", message: "denied" } }, false)).toThrow("OpenSSL is required");
  });
});
