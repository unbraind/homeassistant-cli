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
