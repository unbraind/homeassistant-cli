/**
 * Defines type-safe lists contracts used by the Home Assistant API and CLI.
 */
export interface HaTodoList {
  entity_id: string;
  name: string;
}

export interface HaTodoItem {
  summary: string;
  uid: string;
  status: "needs_action" | "completed";
  description?: string | null;
  due?: string | null;
}

export interface HaShoppingListItem {
  name: string;
  id: string;
  complete: boolean;
}

export interface HaPersistentNotification {
  message: string;
  notification_id: string;
  title: string;
  created_at: string;
}
