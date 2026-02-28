import type { Config } from "../types/options.js";
import type {
  HaTodoList,
  HaTodoItem,
  HaShoppingListItem,
  HaPersistentNotification,
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
}
