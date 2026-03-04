import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createMqttCommand(): Command {
  const command = new Command("mqtt")
    .description("Interact with the Home Assistant MQTT integration (publish messages, reload config)")
    .option("--publish", "Publish a message to an MQTT topic")
    .option("--topic <topic>", "MQTT topic to publish to (use with --publish)")
    .option("--payload <payload>", "Message payload to publish (use with --publish)")
    .option("--qos <0|1|2>", "MQTT QoS level: 0 (at most once), 1 (at least once), 2 (exactly once)")
    .option("--retain", "Set the retain flag on the published message")
    .option("--reload", "Reload MQTT configuration from YAML");

  command.action(withExit(async (options: {
    publish?: boolean;
    topic?: string;
    payload?: string;
    qos?: string;
    retain?: boolean;
    reload?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.publish) {
      if (!options.topic) {
        console.error("Error: --topic is required when using --publish");
        process.exit(1);
        return;
      }
      const serviceData: Record<string, unknown> = { topic: options.topic };
      if (options.payload !== undefined) serviceData["payload"] = options.payload;
      if (options.retain) serviceData["retain"] = true;
      if (options.qos !== undefined) {
        const qos = parseInt(options.qos, 10);
        if (isNaN(qos) || qos < 0 || qos > 2) {
          console.error("Error: --qos must be 0, 1, or 2");
          process.exit(1);
          return;
        }
        serviceData["qos"] = qos;
      }
      await client.callService("mqtt", "publish", serviceData);
      console.log(formatOutput({ success: true, action: "published", topic: options.topic, payload: options.payload }, format));
      return;
    }

    if (options.reload) {
      await client.callService("mqtt", "reload", {});
      console.log(formatOutput({ success: true, action: "reloaded" }, format));
      return;
    }

    console.error("Error: specify --publish --topic <topic> [--payload <payload>] or --reload");
    process.exit(1);
  }));

  return command;
}
