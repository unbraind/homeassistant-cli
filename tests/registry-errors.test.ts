import { describe, it, expect, vi } from "vitest";
import { createRegistryFailureReporter, sanitizeRegistryError } from "../src/commands/registry-errors.js";

describe("registry error sanitization", () => {
  it("retains ordinary and non-Error failure causes with an empty token", () => {
    expect(sanitizeRegistryError(new Error("connect ECONNREFUSED"), "")).toBe("connect ECONNREFUSED");
    expect(sanitizeRegistryError("WebSocket timeout", "")).toBe("WebSocket timeout");
    expect(sanitizeRegistryError(undefined, "")).toBe("undefined");
  });

  it("redacts raw and encoded configured tokens", () => {
    expect(sanitizeRegistryError("Failed token+with/slashes and token%2Bwith%2Fslashes", "token+with/slashes"))
      .toBe("Failed [redacted] and [redacted]");
  });

  it("redacts URL userinfo, auth headers, query and JSON credentials", () => {
    const result = sanitizeRegistryError([
      "connect socks5://name:p%40ss@proxy.invalid:1080/",
      "Authorization: Basic base64-sentinel",
      "Proxy-Authorization: Bearer header-sentinel",
      "https://ha.invalid/api?access_token=query-sentinel&safe=yes",
      '\"token\":\"json-sentinel\"',
      "api_key=key-sentinel password=password-sentinel secret=secret-sentinel",
    ].join("; "), "unrelated-token");
    expect(result).toBe([
      "connect socks5://[redacted]@proxy.invalid:1080/",
      "Authorization: Basic [redacted]",
      "Proxy-Authorization: Bearer [redacted]",
      "https://ha.invalid/api?access_token=[redacted]&safe=yes",
      '\"token\":\"[redacted]\"',
      "api_key=[redacted] password=[redacted] secret=[redacted]",
    ].join("; "));
  });
});

describe("registry failure reporter redaction", () => {
  it.each(["json", "json-compact", "yaml", "toon", "table", "markdown"] as const)("redacts primary and fallback causes before %s output and final errors", (format) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const reporter = createRegistryFailureReporter(format, "configured-token");
      reporter.report({ area_registry: [], message: "Area registry unavailable." },
        new Error('WS denied {"password":"comma,LEAK_COMMA space LEAK_SPACE\\\"LEAK_ESCAPE&?#}"}'),
        "REST denied secret='prefix,LEAK_FALLBACK\\'LEAK_SINGLE' configured-token");
      const output = log.mock.calls.map(([value]) => String(value)).join("\n");
      expect(output).toContain("[redacted]");
      for (const secret of ["LEAK_COMMA", "LEAK_SPACE", "LEAK_ESCAPE", "LEAK_FALLBACK", "LEAK_SINGLE", "configured-token"]) {
        expect(output).not.toContain(secret);
      }
      expect(reporter.throwIfFailed).toThrow(
        'Registry query failed: Area registry unavailable. WS denied {"password":"[redacted]"}; REST denied secret=\'[redacted]\' [redacted]',
      );
    } finally {
      log.mockRestore();
    }
  });
});

describe("complete credential assignments", () => {
  it.each(["access_token", "token", "api_key", "password", "secret"])("redacts quoted %s values including delimiters and escaped quotes", (key) => {
    for (const quote of ['"', "'"]) {
      for (const value of [
        "pa,ss", "has spaces and\ta tab\nwith a newline", "has&?#,;}:=delimiters",
        `escaped\\${quote}quote-tail`, `doubled${quote}${quote}quote-tail`,
        "escaped\\\\backslash-tail", `backslash\\\\\\${quote}quote-tail`, "", "trailing\\\\",
      ]) {
        const assignment = `${quote}${key}${quote} : ${quote}${value}${quote}`;
        expect(sanitizeRegistryError(`Denied ${assignment}, reason=unauthorized`, ""))
          .toBe(`Denied ${quote}${key}${quote} : ${quote}[redacted]${quote}, reason=unauthorized`);
      }
    }
  });

  it("preserves unquoted credential handling and surrounding diagnostic fields", () => {
    expect(sanitizeRegistryError('password=plain&reason=denied token=other?status=401 api_key=key#fragment', ""))
      .toBe('password=[redacted]&reason=denied token=[redacted]?status=401 api_key=[redacted]#fragment');
  });

  it.each([
    { value: 'Bearer prefix\\"LEAK_HEADER', token: "" },
    { value: 'Basic prefix\\"LEAK_BASIC', token: "" },
    { value: 'prefix\\"LEAK_CONFIGURED', token: "prefix\\" },
  ])("parses quoted boundaries before other redactors can remove escapes: $value", ({ value, token }) => {
    expect(sanitizeRegistryError(`password="${value}", status=401`, token))
      .toBe('password="[redacted]", status=401');
  });

  it("redacts consecutive mixed-case quoted assignments without swallowing safe fields", () => {
    expect(sanitizeRegistryError('PASSWORD="comma,tail" token=\'space tail\', "Api_Key":"escape\\\"tail", status=401', ""))
      .toBe('PASSWORD="[redacted]" token=\'[redacted]\', "Api_Key":"[redacted]", status=401');
  });

  it.each(['"', "'"])("fails closed for unterminated %s values, including a final escape", (quote) => {
    for (const ending of ["", "\\"]) {
      expect(sanitizeRegistryError(`Denied password=${quote}comma, space tail${ending}`, ""))
        .toBe(`Denied password=${quote}[redacted]${quote}`);
    }
  });
});
