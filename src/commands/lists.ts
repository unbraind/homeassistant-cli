import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { ListsApiClient, HomeAssistantApiError } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new ListsApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createTodoCommand(): Command {
  const command = new Command("todo")
    .description("Manage todo lists")
    .option("--lists", "List all todo lists")
    .option("-e, --entity-id <entity>", "Get items from a specific todo list")
    .option("-a, --add <summary>", "Add a new todo item (requires --entity-id)")
    .option("--update <uid>", "Update a todo item (requires --entity-id)")
    .option("--remove <uid>", "Remove a todo item (requires --entity-id)")
    .option("-n, --name <summary>", "New summary for update")
    .option("--description <desc>", "Description for add/update")
    .option("--due <date>", "Due date (ISO format) for add/update")
    .option("--complete", "Mark item as completed")
    .option("--incomplete", "Mark item as needing action")
    .option("--count", "Only return count");

  command.action(async (options: {
    lists?: boolean;
    entityId?: string;
    add?: string;
    update?: string;
    remove?: string;
    name?: string;
    description?: string;
    due?: string;
    complete?: boolean;
    incomplete?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.add && options.entityId) {
      await client.addTodoItem(options.entityId, options.add, options.description, options.due);
      console.log(formatOutput({ added: options.add, entity_id: options.entityId }, format));
      return;
    }

    if (options.update && options.entityId) {
      const status = options.complete ? "completed" as const : options.incomplete ? "needs_action" as const : undefined;
      await client.updateTodoItem(options.entityId, options.update, {
        summary: options.name,
        description: options.description,
        due: options.due,
        status,
      });
      console.log(formatOutput({ updated: options.update, entity_id: options.entityId }, format));
      return;
    }

    if (options.remove && options.entityId) {
      await client.removeTodoItem(options.entityId, options.remove);
      console.log(formatOutput({ removed: options.remove, entity_id: options.entityId }, format));
      return;
    }

    if (options.lists || (!options.entityId)) {
      try {
        const lists = await client.getTodoLists();
        if (options.count) {
          console.log(formatOutput({ todo_lists_count: lists.length }, format));
        } else {
          console.log(formatOutput({ todo_lists: lists }, format));
        }
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({ 
            message: "Todo endpoint not available. Ensure todo integration is configured.",
            hint: "Add a todo list integration in Home Assistant first."
          }, format));
        } else {
          throw error;
        }
      }
      return;
    }

    if (options.entityId) {
      try {
        const items = await client.getTodoItems(options.entityId);
        if (options.count) {
          console.log(formatOutput({ todo_items_count: items.length }, format));
        } else {
          console.log(formatOutput({ todo_items: items }, format));
        }
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({ 
            message: "Todo endpoint not available. Ensure todo integration is configured.",
            entity_id: options.entityId
          }, format));
        } else {
          throw error;
        }
      }
    }
  });

  return command;
}

export function createShoppingListCommand(): Command {
  const command = new Command("shopping-list")
    .description("Manage shopping list")
    .option("--list", "List all items")
    .option("--pending", "Show only pending items")
    .option("--completed", "Show only completed items")
    .option("-a, --add <name>", "Add a new item")
    .option("--update <id>", "Update an item (requires --name or --complete)")
    .option("-n, --name <name>", "New name for update")
    .option("--complete", "Mark item as complete")
    .option("--incomplete", "Mark item as incomplete")
    .option("-d, --delete <id>", "Delete an item")
    .option("--clear-completed", "Clear all completed items")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    pending?: boolean;
    completed?: boolean;
    add?: string;
    update?: string;
    name?: string;
    complete?: boolean;
    incomplete?: boolean;
    delete?: string;
    clearCompleted?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.add) {
      const item = await client.addShoppingItem(options.add);
      console.log(formatOutput({ added: item }, format));
      return;
    }

    if (options.update) {
      const complete = options.complete ? true : options.incomplete ? false : undefined;
      const item = await client.updateShoppingItem(options.update, options.name, complete);
      console.log(formatOutput({ updated: item }, format));
      return;
    }

    if (options.delete) {
      await client.deleteShoppingItem(options.delete);
      console.log(formatOutput({ deleted: options.delete }, format));
      return;
    }

    if (options.clearCompleted) {
      await client.clearShoppingListCompleted();
      console.log(formatOutput({ cleared: "completed items" }, format));
      return;
    }

    // Default: list items
    const items = await client.getShoppingList();
    let filtered = items;

    if (options.pending) {
      filtered = items.filter(i => !i.complete);
    } else if (options.completed) {
      filtered = items.filter(i => i.complete);
    }

    if (options.count) {
      console.log(formatOutput({ shopping_list_count: filtered.length }, format));
    } else {
      console.log(formatOutput({ shopping_list: filtered }, format));
    }
  });

  return command;
}

export function createNotificationsCommand(): Command {
  const command = new Command("notifications")
    .description("Manage persistent notifications")
    .option("--list", "List all notifications")
    .option("-c, --create <message>", "Create a notification")
    .option("-t, --title <title>", "Title for notification")
    .option("--id <notification-id>", "Notification ID")
    .option("-d, --dismiss <id>", "Dismiss a notification")
    .option("--dismiss-all", "Dismiss all notifications")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    create?: string;
    title?: string;
    id?: string;
    dismiss?: string;
    dismissAll?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.create) {
      await client.createNotification(options.create, {
        title: options.title,
        notificationId: options.id,
      });
      console.log(formatOutput({ created: true, message: options.create }, format));
      return;
    }

    if (options.dismiss) {
      await client.dismissNotification(options.dismiss);
      console.log(formatOutput({ dismissed: options.dismiss }, format));
      return;
    }

    if (options.dismissAll) {
      await client.dismissAllNotifications();
      console.log(formatOutput({ dismissed: "all" }, format));
      return;
    }

    try {
      const notifications = await client.getPersistentNotifications();

      if (options.count) {
        console.log(formatOutput({ notifications_count: notifications.length }, format));
      } else {
        console.log(formatOutput({ notifications }, format));
      }
    } catch (error) {
      if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
        const baseClient = new (await import("../api/client.js")).HomeAssistantClient(getConfig(globalOpts));
        const states = await baseClient.getStates();
        const notifications = states
          .filter(s => s.entity_id.startsWith("persistent_notification."))
          .map(s => ({
            notification_id: s.entity_id.replace("persistent_notification.", ""),
            message: s.attributes["message"] || "",
            title: s.attributes["title"] || "",
            created_at: s.last_updated,
          }));

        if (options.count) {
          console.log(formatOutput({ notifications_count: notifications.length }, format));
        } else {
          console.log(formatOutput({ notifications }, format));
        }
      } else {
        throw error;
      }
    }
  });

  return command;
}
