/** Decide whether local TLS fixtures may skip, while making missing CI coverage fail. */
export function canRunOpenSslTests(
  probe: { status: number | null; error?: NodeJS.ErrnoException }, required: boolean,
): boolean {
  if (!probe.error && probe.status === 0) return true;
  if (probe.error?.code === "ENOENT" && !required) return false;
  throw new Error("OpenSSL is required for TLS proxy tests; install a working openssl executable and rerun");
}
