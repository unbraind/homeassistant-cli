/**
 * Defines the input command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

type InputDomain = "input_boolean" | "input_text" | "input_number" | "input_select" | "input_datetime" | "input_button";

const INPUT_DOMAINS: InputDomain[] = [
  "input_boolean", "input_text", "input_number",
  "input_select", "input_datetime", "input_button",
];

export function createInputCommand(): Command {
  const command = new Command("input")
    .description("Manage Home Assistant input helper entities")
    .option("-d, --domain <domain>", "Filter by input type (input_boolean, input_text, input_number, input_select, input_datetime, input_button)")
    .option("-e, --entity-id <entityId>", "Get or set a specific input entity")
    .option("--set <value>", "Set the value of an input entity (use with --entity-id)")
    .option("--toggle <entityId>", "Toggle an input_boolean")
    .option("--on <entityId>", "Turn on an input_boolean")
    .option("--off <entityId>", "Turn off an input_boolean")
    .option("--press <entityId>", "Press an input_button")
    .option("--select <option>", "Select an option for input_select (use with --entity-id)")
    .option("--increment <entityId>", "Increment an input_number")
    .option("--decrement <entityId>", "Decrement an input_number")
    .option("--reload", "Reload all input helper configuration")
    .option("--count", "Only return count");

  command.action(withExit(async (options: {
    domain?: string;
    entityId?: string;
    set?: string;
    toggle?: string;
    on?: string;
    off?: string;
    press?: string;
    select?: string;
    increment?: string;
    decrement?: string;
    reload?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.reload) {
      for (const domain of INPUT_DOMAINS) {
        try {
          await client.callService(domain, "reload", {});
        } catch {
          // Some domains may not have reload
        }
      }
      console.log(formatOutput({ success: true, message: "Input helper configuration reloaded" }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("input_boolean", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.on) {
      await client.callService("input_boolean", "turn_on", { entity_id: options.on });
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("input_boolean", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.press) {
      await client.callService("input_button", "press", { entity_id: options.press });
      console.log(formatOutput({ success: true, action: "pressed", entity_id: options.press }, format));
      return;
    }

    if (options.increment) {
      await client.callService("input_number", "increment", { entity_id: options.increment });
      console.log(formatOutput({ success: true, action: "incremented", entity_id: options.increment }, format));
      return;
    }

    if (options.decrement) {
      await client.callService("input_number", "decrement", { entity_id: options.decrement });
      console.log(formatOutput({ success: true, action: "decremented", entity_id: options.decrement }, format));
      return;
    }

    if (options.entityId && options.set) {
      const domain = options.entityId.split(".")[0] as InputDomain;
      let service = "set_value";
      const data: Record<string, string | null | undefined> = { entity_id: options.entityId, value: options.set };
      if (domain === "input_select") {
        service = "select_option";
        data["option"] = options.set;
        delete data["value"];
      } else if (domain === "input_datetime") {
        service = "set_datetime";
        // Accept ISO date/time string; HA handles both date and datetime
        delete data["value"];
        if (options.set.includes("T") || options.set.includes(" ")) {
          data["datetime"] = options.set;
        } else {
          data["date"] = options.set;
        }
      }
      await client.callService(domain, service, data);
      console.log(formatOutput({ success: true, action: "set", entity_id: options.entityId, value: options.set }, format));
      return;
    }

    if (options.entityId && options.select) {
      await client.callService("input_select", "select_option", {
        entity_id: options.entityId,
        option: options.select,
      });
      console.log(formatOutput({ success: true, action: "selected", entity_id: options.entityId, option: options.select }, format));
      return;
    }

    // List input entities
    const states = await client.getStates();
    let inputs = states.filter(s => INPUT_DOMAINS.some(d => s.entity_id.startsWith(`${d}.`)));
    if (options.domain) {
      inputs = inputs.filter(s => s.entity_id.startsWith(`${options.domain}.`));
    }
    if (options.entityId) {
      inputs = inputs.filter(s => s.entity_id === options.entityId);
    }

    const simplified = inputs.map(s => ({
      entity_id: s.entity_id,
      domain: s.entity_id.split(".")[0],
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      min: s.attributes["min"],
      max: s.attributes["max"],
      options: s.attributes["options"],
    }));

    if (options.count) {
      console.log(formatOutput({ input_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ inputs: simplified }, format));
  }));

  return command;
}
