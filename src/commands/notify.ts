/**
 * Defines the notify command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { ListsApiClient } from "../api/lists.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createNotifyCommand(): Command {
  const command = new Command("notify")
    .description("Send notifications through Home Assistant")
    .argument("<service>", "Notification service (e.g., 'mobile_app_phone', 'email')")
    .requiredOption("-m, --message <message>", "Notification message")
    .option("-t, --title <title>", "Notification title")
    .option("--target <target>", "Notification target (can be comma-separated)")
    .option("-d, --data <json>", "Additional data as JSON string")
    .action(withExit(async (service: string, options: {
      message: string;
      title?: string;
      target?: string;
      data?: string;
    }, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new ListsApiClient(config);

      let parsedData: Record<string, unknown> | undefined;
      if (options.data) {
        try {
          parsedData = JSON.parse(options.data);
        } catch {
          console.error("ERROR: Invalid JSON in --data");
          process.exit(1);
        }
      }

      const target = options.target?.split(",").map(t => t.trim());
      
      const notifOptions: { title?: string; target?: string | string[]; data?: Record<string, unknown> } = {};
      if (options.title) notifOptions.title = options.title;
      if (target) notifOptions.target = target;
      if (parsedData) notifOptions.data = parsedData;
      
      await client.sendNotification(service, options.message, notifOptions);

      console.log(formatOutput({ 
        sent: true, 
        service: `notify.${service}`,
        message: options.message 
      }, format));
    }));

  return command;
}
