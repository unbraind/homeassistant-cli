interface RedactableApiSection {
  location: string;
}

interface RedactableReport {
  api: RedactableApiSection;
}

export function redactCapabilitiesReport<T extends RedactableReport>(report: T): T {
  return {
    ...report,
    api: {
      ...report.api,
      location: "[REDACTED]",
    },
  };
}
