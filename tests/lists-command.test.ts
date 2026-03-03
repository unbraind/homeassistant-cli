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
    const result = await captureLog(() => cmd.parseAsync(["node", "test", "--lists"], { from: "user" }));

    expect(result).toContain("todo.groceries");
    expect(result).toContain("Groceries");
  });

  it("lists todo lists with --count", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([{ entity_id: "todo.groceries", name: "Groceries" }])
    );

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--lists", "--count"], { from: "user" })
    );

    expect(result).toContain("todo_lists_count");
    expect(result).toContain("1");
  });

  it("adds a todo item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "-e", "todo.groceries", "-a", "Buy milk"], { from: "user" })
    );

    expect(result).toContain("Buy milk");
    expect(result).toContain("todo.groceries");
  });

  it("removes a todo item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "-e", "todo.groceries", "--remove", "uid-123"], { from: "user" })
    );

    expect(result).toContain("uid-123");
    expect(result).toContain("removed");
  });

  it("updates a todo item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTodoCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["node", "test", "-e", "todo.groceries", "--update", "uid-123", "-n", "Updated item", "--complete"],
        { from: "user" }
      )
    );

    expect(result).toContain("uid-123");
    expect(result).toContain("updated");
  });

  it("handles 404 on todo endpoint", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createTodoCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test", "--lists"], { from: "user" }));

    expect(result).toContain("Todo endpoint not available");
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
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

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
    const result = await captureLog(() => cmd.parseAsync(["node", "test", "--count"], { from: "user" }));

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
      cmd.parseAsync(["node", "test", "--pending"], { from: "user" })
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
      cmd.parseAsync(["node", "test", "--completed"], { from: "user" })
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
      cmd.parseAsync(["node", "test", "-a", "Eggs"], { from: "user" })
    );

    expect(result).toContain("Eggs");
  });

  it("deletes a shopping item", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(""));

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "-d", "item-1"], { from: "user" })
    );

    expect(result).toContain("item-1");
    expect(result).toContain("deleted");
  });

  it("clears completed items", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(""));

    const cmd = createShoppingListCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--clear-completed"], { from: "user" })
    );

    expect(result).toContain("cleared");
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
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

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
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );

    expect(result).toContain("notifications_count");
    expect(result).toContain("1");
  });

  it("creates a notification", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "-c", "Hello world", "-t", "Greeting"], { from: "user" })
    );

    expect(result).toContain("Hello world");
    expect(result).toContain("created");
  });

  it("dismisses a notification", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "-d", "n1"], { from: "user" })
    );

    expect(result).toContain("n1");
    expect(result).toContain("dismissed");
  });

  it("dismisses all notifications", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotificationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--dismiss-all"], { from: "user" })
    );

    expect(result).toContain("all");
    expect(result).toContain("dismissed");
  });
});
