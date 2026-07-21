import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTodoCommand, createShoppingListCommand, createNotificationsCommand } from "../src/commands/lists.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

describe("todo command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists todo lists", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([{ entity_id: "todo.groceries", name: "Groceries" }])
    );

    const cmd = createTodoCommand();
    const result = await captureLog(() => cmd.parseAsync(["--lists"], { from: "user" }));

    expect(result).toContain("todo.groceries");
    expect(result).toContain("Groceries");
  });

  it("lists todo lists with --count", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([{ entity_id: "todo.groceries", name: "Groceries" }])
    );

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--lists", "--count"], { from: "user" })
    );

    expect(result).toContain("todo_lists_count");
    expect(result).toContain("1");
  });

  it("adds a todo item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["-e", "todo.groceries", "-a", "Buy milk"], { from: "user" })
    );

    expect(result).toContain("Buy milk");
    expect(result).toContain("todo.groceries");
  });

  it("adds a todo item with description and due date", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createTodoCommand().parseAsync([
      "-e", "todo.groceries", "-a", "Milk", "--description", "Two cartons", "--due", "2026-07-22",
    ], { from: "user" }));
    const body = JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body);
    expect(body).toMatchObject({ description: "Two cartons", due_date: "2026-07-22" });
  });

  it("removes a todo item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["-e", "todo.groceries", "--remove", "uid-123"], { from: "user" })
    );

    expect(result).toContain("uid-123");
    expect(result).toContain("removed");
  });

  it("updates a todo item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["-e", "todo.groceries", "--update", "uid-123", "-n", "Updated item", "--complete"],
        { from: "user" }
      )
    );

    expect(result).toContain("uid-123");
    expect(result).toContain("updated");
  });

  it("updates every optional todo field and marks the item incomplete", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createTodoCommand().parseAsync([
      "-e", "todo.groceries", "--update", "uid-123", "--description", "Fresh",
      "--due", "2026-07-22", "--incomplete",
    ], { from: "user" }));
    const body = JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body);
    expect(body).toMatchObject({ description: "Fresh", due_date: "2026-07-22", status: "needs_action" });
  });

  it("allows a todo update with no optional mutations", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createTodoCommand().parseAsync([
      "-e", "todo.groceries", "--update", "uid-123",
    ], { from: "user" }));
    expect(JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body)).toEqual({
      entity_id: "todo.groceries", item_id: "uid-123",
    });
  });

  it("lists todo lists by default when no entity is supplied", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    expect(await captureLog(() => createTodoCommand().parseAsync([], { from: "user" }))).toContain("todo_lists");
  });

  it("performs no implicit list operation when only an entity is supplied", async () => {
    expect(await captureLog(() => createTodoCommand().parseAsync([
      "-e", "todo.groceries",
    ], { from: "user" }))).toBe("");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("handles 404 on todo endpoint", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createTodoCommand();
    const result = await captureLog(() => cmd.parseAsync(["--lists"], { from: "user" }));

    expect(result).toContain("Todo endpoint not available");
  });

  it("preserves non-404 todo failures", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Failure" }, 400));
    await expect(createTodoCommand().parseAsync(["--lists"], { from: "user" })).rejects.toThrow("400");
  });
});

describe("shopping-list command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists shopping items", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { id: "1", name: "Milk", complete: false },
        { id: "2", name: "Bread", complete: true },
      ])
    );

    const cmd = createShoppingListCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("Milk");
    expect(result).toContain("Bread");
  });

  it("lists with --count", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { id: "1", name: "Milk", complete: false },
        { id: "2", name: "Bread", complete: true },
      ])
    );

    const cmd = createShoppingListCommand();
    const result = await captureLog(() => cmd.parseAsync(["--count"], { from: "user" }));

    expect(result).toContain("shopping_list_count");
    expect(result).toContain("2");
  });

  it("filters pending items", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { id: "1", name: "Milk", complete: false },
        { id: "2", name: "Bread", complete: true },
      ])
    );

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--pending"], { from: "user" })
    );

    expect(result).toContain("Milk");
    expect(result).not.toContain("Bread");
  });

  it("filters completed items", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { id: "1", name: "Milk", complete: false },
        { id: "2", name: "Bread", complete: true },
      ])
    );

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--completed"], { from: "user" })
    );

    expect(result).not.toContain("Milk");
    expect(result).toContain("Bread");
  });

  it("adds a shopping item", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse({ id: "3", name: "Eggs", complete: false })
    );

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["-a", "Eggs"], { from: "user" })
    );

    expect(result).toContain("Eggs");
  });

  it("deletes a shopping item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(""));

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["-d", "item-1"], { from: "user" })
    );

    expect(result).toContain("item-1");
    expect(result).toContain("deleted");
  });

  it("clears completed items", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(""));

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--clear-completed"], { from: "user" })
    );

    expect(result).toContain("cleared");
  });

  it("updates a shopping item", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse({ id: "2", name: "Updated Milk", complete: true })
    );

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--update", "2", "--name", "Updated Milk", "--complete"], { from: "user" })
    );

    expect(result).toContain("updated");
    expect(result).toContain("Updated Milk");
  });

  it.each([
    [["--update", "2", "--incomplete"], false],
    [["--update", "2"], undefined],
  ])("updates shopping completion with %j", async (args, expectedComplete) => {
    mockRequest.mockResolvedValueOnce(mockResponse({ id: "2", name: "Milk", complete: expectedComplete }));
    await captureLog(() => createShoppingListCommand().parseAsync(args, { from: "user" }));
    const body = JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body);
    expect(body.complete).toBe(expectedComplete);
  });
});

describe("notifications command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists notifications", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { notification_id: "n1", message: "Test notification", title: "Test", created_at: "2024-01-01T00:00:00Z" },
      ])
    );

    const cmd = createNotificationsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("Test notification");
  });

  it("lists notifications with --count", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { notification_id: "n1", message: "Test notification", title: "Test", created_at: "2024-01-01T00:00:00Z" },
      ])
    );

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    expect(result).toContain("notifications_count");
    expect(result).toContain("1");
  });

  it("creates a notification", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["-c", "Hello world", "-t", "Greeting"], { from: "user" })
    );

    expect(result).toContain("Hello world");
    expect(result).toContain("created");
  });

  it("creates a notification with an explicit id but no title", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createNotificationsCommand().parseAsync([
      "-c", "Hello", "--id", "stable-id",
    ], { from: "user" }));
    const body = JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body);
    expect(body).toMatchObject({ message: "Hello", notification_id: "stable-id" });
    expect(body.title).toBeUndefined();
  });

  it("dismisses a notification", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["-d", "n1"], { from: "user" })
    );

    expect(result).toContain("n1");
    expect(result).toContain("dismissed");
  });

  it("dismisses all notifications", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--dismiss-all"], { from: "user" })
    );

    expect(result).toContain("all");
    expect(result).toContain("dismissed");
  });

  it("falls back to states when notifications endpoint returns 404", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404))
      .mockResolvedValueOnce(
        mockResponse([
          {
            entity_id: "persistent_notification.info",
            state: "notifying",
            attributes: { message: "System update available", title: "Update" },
            last_changed: "2024-01-01T00:00:00Z",
            last_updated: "2024-01-01T00:00:00Z",
          },
          { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "", last_updated: "" },
        ])
      );

    const cmd = createNotificationsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("System update available");
    expect(result).not.toContain("light.kitchen");
  });

  it("falls back to states with --count when 404", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404))
      .mockResolvedValueOnce(
        mockResponse([
          {
            entity_id: "persistent_notification.info",
            state: "notifying",
            attributes: { message: "Update", title: "Update" },
            last_changed: "",
            last_updated: "",
          },
        ])
      );

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    expect(result).toContain("notifications_count");
    expect(result).toContain("1");
  });

  it("uses empty strings for absent fallback notification fields", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse({ message: "Not found" }, 404))
      .mockResolvedValueOnce(mockResponse([{
        entity_id: "persistent_notification.empty", state: "notifying", attributes: {}, last_updated: "now",
      }]));
    const result = JSON.parse(await captureLog(() => createNotificationsCommand().parseAsync([], { from: "user" })));
    expect(result.notifications[0]).toMatchObject({ message: "", title: "" });
  });

  it("preserves non-404 notification failures", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Failure" }, 400));
    await expect(createNotificationsCommand().parseAsync([], { from: "user" })).rejects.toThrow("400");
  });
});
