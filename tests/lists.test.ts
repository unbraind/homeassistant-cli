import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ListsApiClient } from "../src/api/lists.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

describe("ListsApiClient", () => {
  let client: ListsApiClient;

  beforeEach(() => {
    client = new ListsApiClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getTodoLists", () => {
    it("should return todo lists", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "todo.shopping", name: "Shopping" },
          { entity_id: "todo.tasks", name: "Tasks" },
        ])
      );
      const result = await client.getTodoLists();
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Shopping");
    });
  });

  describe("getTodoItems", () => {
    it("should return todo items", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { summary: "Buy milk", uid: "item1", status: "needs_action" },
          { summary: "Buy eggs", uid: "item2", status: "completed" },
        ])
      );
      const result = await client.getTodoItems("todo.shopping");
      expect(result).toHaveLength(2);
      expect(result[0]?.summary).toBe("Buy milk");
    });
  });

  describe("getShoppingList", () => {
    it("should return shopping list items", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { id: "item1", name: "Apples", complete: false },
          { id: "item2", name: "Bananas", complete: true },
        ])
      );
      const result = await client.getShoppingList();
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Apples");
    });
  });

  describe("addShoppingItem", () => {
    it("should add a shopping item", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ id: "new_item", name: "Oranges", complete: false })
      );
      const result = await client.addShoppingItem("Oranges");
      expect(result.name).toBe("Oranges");
      expect(result.complete).toBe(false);
    });
  });

  describe("updateShoppingItem", () => {
    it("should update item name", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ id: "item1", name: "Red Apples", complete: false })
      );
      const result = await client.updateShoppingItem("item1", "Red Apples");
      expect(result.name).toBe("Red Apples");
    });

    it("should mark item as complete", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ id: "item1", name: "Apples", complete: true })
      );
      const result = await client.updateShoppingItem("item1", undefined, true);
      expect(result.complete).toBe(true);
    });
  });

  describe("deleteShoppingItem", () => {
    it("should delete a shopping item", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { text: () => Promise.resolve("") },
      });
      await client.deleteShoppingItem("item1");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/shopping_list/item/item1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("clearShoppingListCompleted", () => {
    it("should clear completed items", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { text: () => Promise.resolve("") },
      });
      await client.clearShoppingListCompleted();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/shopping_list/clear_completed"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("getPersistentNotifications", () => {
    it("should return notifications", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            message: "Test notification",
            notification_id: "notif1",
            title: "Test",
            created_at: "2024-01-01T00:00:00Z",
          },
        ])
      );
      const result = await client.getPersistentNotifications();
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Test");
    });
  });

  describe("dismissNotification", () => {
    it("should dismiss a notification", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ context: { id: "123" } })
      );
      await client.dismissNotification("notif1");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/persistent_notification/dismiss"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("covers notification and todo service workflows with optional data", async () => {
    mockRequest.mockResolvedValue(mockResponse({ context: { id: "ctx" } }));
    await client.createNotification("message", { title: "Title", notificationId: "notice" });
    await client.dismissAllNotifications();
    await client.sendNotification("mobile_app_phone", "hello", {
      title: "Title", target: ["phone"], data: { importance: "high" },
    });
    await client.addTodoItem("todo.tasks", "ship", "description", "2026-07-22");
    await client.updateTodoItem("todo.tasks", "uid", {
      summary: "shipped", description: "done", due: "2026-07-23", status: "completed",
    });
    await client.removeTodoItem("todo.tasks", "uid");
    await client.completeShoppingItemByName("Milk");
    await client.incompleteShoppingItemByName("Milk");
    await client.clearShoppingList();
    expect(mockRequest).toHaveBeenCalledTimes(9);
  });

  it("omits optional service data and returns empty todo responses safely", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }))
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }))
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }))
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await client.createNotification("message");
    await client.sendNotification("notify", "hello");
    await client.addTodoItem("todo.tasks", "ship");
    await client.updateTodoItem("todo.tasks", "uid", {});

    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await expect(client.getTodoItemsViaService("todo.tasks")).resolves.toEqual([]);
  });

  it("returns todo items from a service response", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      context: { id: "ctx" }, response: { items: [{ uid: "1", summary: "Ship", status: "needs_action" }] },
    }));
    await expect(client.getTodoItemsViaService("todo.tasks")).resolves.toEqual([
      { uid: "1", summary: "Ship", status: "needs_action" },
    ]);
  });
});
