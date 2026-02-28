import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { ListsApiClient } from "../api/index.js";
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
    .option("--count", "Only return count");

  command.action(async (options: {
    lists?: boolean;
    entityId?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.lists || (!options.entityId)) {
      const lists = await client.getTodoLists();
      if (options.count) {
        console.log(formatOutput({ todo_lists_count: lists.length }, format));
      } else {
        console.log(formatOutput({ todo_lists: lists }, format));
      }
    }

    if (options.entityId) {
      const items = await client.getTodoItems(options.entityId);
      if (options.count) {
        console.log(formatOutput({ todo_items_count: items.length }, format));
      } else {
        console.log(formatOutput({ todo_items: items }, format));
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
    .option("-u, --update <id>", "Update an item (requires --name or --complete)")
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
    .option("-d, --dismiss <id>", "Dismiss a notification")
    .option("--count", "Only return count");

  command.action(async (options: {
    list?: boolean;
    dismiss?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.dismiss) {
      await client.dismissNotification(options.dismiss);
      console.log(formatOutput({ dismissed: options.dismiss }, format));
      return;
    }

    // Default: list notifications
    const notifications = await client.getPersistentNotifications();

    if (options.count) {
      console.log(formatOutput({ notifications_count: notifications.length }, format));
    } else {
      console.log(formatOutput({ notifications }, format));
    }
  });

  return command;
}
