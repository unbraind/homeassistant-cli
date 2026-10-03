/**
 * Reports sanitized registry failures while retaining useful partial query results.
 */
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

export type RegistryFailureReporter = (
  payload: Record<string, unknown>,
  error: unknown,
  ...fallbackErrors: unknown[]
) => void;

/** Remove credentials from diagnostics without hiding the underlying failure reason. */
export function sanitizeRegistryError(error: unknown, token: string): string {
  let message = error instanceof Error ? error.message : String(error);
  if (token) {
    for (const secret of [token, encodeURIComponent(token)]) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }
  return message
    .replace(/(\b[a-z][a-z\d+.-]*:\/\/)[^\s/?#]*@/gi, "$1[redacted]@")
    .replace(/\b(Bearer|Basic)\s+[^\s,;"']+/gi, "$1 [redacted]")
    .replace(/(["']?(?:access_token|token|api_key|password|secret)["']?\s*[:=]\s*["']?)[^\s&?#,"'}]+/gi, "$1[redacted]");
}

/** Collect failures so every requested registry can be reported before the command fails. */
export function createRegistryFailureReporter(format: OutputFormat, token: string): {
  report: RegistryFailureReporter;
  throwIfFailed: () => void;
} {
  const failures: string[] = [];
  return {
    report(payload, error, ...fallbackErrors) {
      const cause = sanitizeRegistryError(error, token);
      const fallbackCauses = fallbackErrors.map(failure => sanitizeRegistryError(failure, token));
      failures.push(`${String(payload["message"])} ${[cause, ...fallbackCauses].join("; ")}`);
      console.log(formatOutput({
        ...payload,
        success: false,
        error: cause,
        ...(fallbackCauses.length > 0 ? { fallback_error: fallbackCauses.join("; ") } : {}),
      }, format));
    },
    throwIfFailed() {
      if (failures.length > 0) throw new Error(`Registry query failed: ${failures.join("; ")}`);
    },
  };
}
