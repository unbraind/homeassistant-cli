/**
 * Implements typed Home Assistant lists API transport operations.
 */
import type { Config } from "../types/options.js";
import type {
  HaTodoList,
  HaTodoItem,
  HaShoppingListItem,
  HaPersistentNotification,
  HaServiceCallResult,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";

export class ListsApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getTodoLists(): Promise<HaTodoList[]> {
    return this.request<HaTodoList[]>("GET", "/todo");
  }

  async getTodoItems(entityId: string): Promise<HaTodoItem[]> {
    return this.request<HaTodoItem[]>("GET", `/todo/${entityId}`);
  }

  async getShoppingList(): Promise<HaShoppingListItem[]> {
    return this.request<HaShoppingListItem[]>("GET", "/shopping_list");
  }

  async addShoppingItem(name: string): Promise<HaShoppingListItem> {
    return this.request<HaShoppingListItem>("POST", "/shopping_list/item", { name });
  }

  async updateShoppingItem(itemId: string, name?: string, complete?: boolean): Promise<HaShoppingListItem> {
    const body: Record<string, unknown> = {};
    if (name !== undefined) body["name"] = name;
    if (complete !== undefined) body["complete"] = complete;
    return this.request<HaShoppingListItem>("POST", `/shopping_list/item/${itemId}`, body);
  }

  async deleteShoppingItem(itemId: string): Promise<void> {
    await this.request<void>("DELETE", `/shopping_list/item/${itemId}`);
  }

  async clearShoppingListCompleted(): Promise<void> {
    await this.request<void>("POST", "/shopping_list/clear_completed");
  }

  async getPersistentNotifications(): Promise<HaPersistentNotification[]> {
    return this.request<HaPersistentNotification[]>("GET", "/persistent_notification");
  }

  async dismissNotification(notificationId: string): Promise<void> {
    await this.callService("persistent_notification", "dismiss", { notification_id: notificationId });
  }

  async createNotification(
    message: string,
    options?: { title?: string; notificationId?: string }
  ): Promise<void> {
    await this.callService("persistent_notification", "create", {
      message,
      title: options?.title,
      notification_id: options?.notificationId,
    });
  }

  async dismissAllNotifications(): Promise<void> {
    await this.callService("persistent_notification", "dismiss_all");
  }

  async sendNotification(
    service: string,
    message: string,
    options?: { title?: string; target?: string | string[]; data?: Record<string, unknown> }
  ): Promise<HaServiceCallResult> {
    const data: Record<string, unknown> = { message };
    if (options?.title) data["title"] = options.title;
    if (options?.target) data["target"] = options.target;
    if (options?.data) data["data"] = options.data;
    return this.callService("notify", service, data);
  }

  async addTodoItem(entityId: string, summary: string, description?: string, due?: string): Promise<void> {
    const data: Record<string, unknown> = { entity_id: entityId, item: summary };
    if (description) data["description"] = description;
    if (due) data["due_date"] = due;
    await this.callService("todo", "add_item", data);
  }

  async updateTodoItem(entityId: string, itemUid: string, updates: { summary?: string; description?: string; due?: string; status?: "needs_action" | "completed" }): Promise<void> {
    const data: Record<string, unknown> = { entity_id: entityId, item_id: itemUid };
    if (updates.summary) data["item"] = updates.summary;
    if (updates.description) data["description"] = updates.description;
    if (updates.due) data["due_date"] = updates.due;
    if (updates.status) data["status"] = updates.status;
    await this.callService("todo", "update_item", data);
  }

  async removeTodoItem(entityId: string, itemUid: string): Promise<void> {
    await this.callService("todo", "remove_item", { entity_id: entityId, item_id: itemUid });
  }

  async getTodoItemsViaService(entityId: string): Promise<HaTodoItem[]> {
    const result = await this.callService("todo", "get_items", { entity_id: entityId }, true);
    return (result.response as { items: HaTodoItem[] })?.items ?? [];
  }

  async completeShoppingItemByName(name: string): Promise<void> {
    await this.callService("shopping_list", "complete_item", { name });
  }

  async incompleteShoppingItemByName(name: string): Promise<void> {
    await this.callService("shopping_list", "incomplete_item", { name });
  }

  async clearShoppingList(): Promise<void> {
    await this.callService("shopping_list", "clear");
  }
}
