export class HomeAssistantApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "HomeAssistantApiError";
  }
}

export class HomeAssistantConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeAssistantConnectionError";
  }
}

export class HomeAssistantReadOnlyError extends Error {
  constructor(method: string, path: string) {
    super(`Read-only mode blocked ${method} /api${path}. Disable read-only mode to allow write operations.`);
    this.name = "HomeAssistantReadOnlyError";
  }
}
