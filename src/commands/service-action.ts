/**
 * Defines normalized, typed Home Assistant service-action planning and execution.
 */
import { readFile } from "node:fs/promises";
import { Command, Option } from "commander";
import { HomeAssistantReadOnlyError } from "../api/errors.js";
import { HomeAssistantServiceActionClient } from "../api/service-action.js";
import { formatOutput } from "../formatters/index.js";
import type {
  HaContext,
  HaRestServiceCallResult,
  HaServiceDefinition,
  HaState,
  HaWebSocketServiceCallResult,
} from "../types/api.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";
import {
  findServiceDefinition,
  validateServiceData,
  type ServiceDataValidationResult,
} from "../utils/services.js";

type ResponseMode = "auto" | "always" | "never";
type ServiceTransport = "rest" | "websocket";
type ResponseCapability = "none" | "optional" | "required" | "unknown";
type ServiceTarget = Record<string, string[]>;
const SERVICE_TARGET_KEYS = new Set(["entity_id", "device_id", "area_id", "floor_id", "label_id"]);

interface ServiceActionOptions {
  areaId?: string;
  data?: string;
  dataFile?: string;
  deviceId?: string;
  dryRun?: boolean;
  entityId?: string;
  floorId?: string;
  labelId?: string;
  response: ResponseMode;
  returnResponse?: boolean;
  strictInput?: boolean;
  target?: string;
  transport: ServiceTransport;
  validateInput?: boolean;
}

interface ServiceActionEnvelope {
  operation: "service_action";
  transport: ServiceTransport;
  domain: string;
  service: string;
  response_capability: ResponseCapability;
  response_requested: boolean;
  changed_state_count: number;
  changed_states: HaState[];
  context: HaContext | null;
  service_response: unknown | null;
}

function parseObject(value: string, name: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

function parseIds(value: string | undefined): string[] | undefined {
  const values = value?.split(",").map((entry) => entry.trim()).filter(Boolean);
  return values && values.length > 0 ? values : undefined;
}

function parseTarget(value: string | undefined): ServiceTarget {
  if (!value) return {};
  const parsed = parseObject(value, "Target");
  const target: ServiceTarget = {};
  for (const [key, raw] of Object.entries(parsed)) {
    if (!SERVICE_TARGET_KEYS.has(key)) {
      throw new Error(`Unknown target field '${key}'`);
    }
    const values = typeof raw === "string" ? [raw] : raw;
    if (!Array.isArray(values) || values.some((entry) => typeof entry !== "string" || entry.length === 0)) {
      throw new Error(`Target field '${key}' must be a string or array of non-empty strings`);
    }
    target[key] = values;
  }
  return target;
}

function responseCapability(definition: HaServiceDefinition | undefined): ResponseCapability {
  if (!definition) return "unknown";
  if (!definition.response) return "none";
  return definition.response.optional === true ? "optional" : "required";
}

function normalizeRestResult(
  result: HaRestServiceCallResult,
  base: Omit<ServiceActionEnvelope, "changed_state_count" | "changed_states" | "context" | "service_response">,
): ServiceActionEnvelope {
  const changedStates = Array.isArray(result) ? result : result.changed_states;
  return {
    ...base,
    changed_state_count: changedStates.length,
    changed_states: changedStates,
    context: null,
    service_response: Array.isArray(result) ? null : result.service_response,
  };
}

function normalizeWebSocketResult(
  result: HaWebSocketServiceCallResult,
  base: Omit<ServiceActionEnvelope, "changed_state_count" | "changed_states" | "context" | "service_response">,
): ServiceActionEnvelope {
  return {
    ...base,
    changed_state_count: 0,
    changed_states: [],
    context: result.context,
    service_response: result.response,
  };
}

/** Build the cross-transport service-action command. */
export function createCallServiceCommand(): Command {
  const command = new Command("call-service")
    .description("Plan or execute a typed Home Assistant service action")
    .argument("<domain>", "Service domain (e.g., light, weather)")
    .argument("<service>", "Service action name (e.g., turn_on, get_forecasts)")
    .option("-e, --entity-id <ids>", "Comma-separated entity target IDs")
    .option("--device-id <ids>", "Comma-separated device target IDs")
    .option("--area-id <ids>", "Comma-separated area target IDs")
    .option("--floor-id <ids>", "Comma-separated floor target IDs")
    .option("--label-id <ids>", "Comma-separated label target IDs")
    .option("--target <json>", "Target selector object; explicit selector flags override matching keys")
    .option("-d, --data <json>", "Service data as a JSON object")
    .option("--data-file <path>", "Read service data from a JSON file; --data takes precedence")
    .addOption(new Option("--transport <transport>", "Action transport").choices(["rest", "websocket"]).default("rest"))
    .addOption(new Option("--response <mode>", "Response data policy").choices(["auto", "always", "never"]).default("auto"))
    .option("-r, --return-response", "Request response data (legacy alias for --response always)", false)
    .option("--validate-input", "Validate service data against the live service schema", false)
    .option("--strict-input", "Fail on unknown service data fields (implies --validate-input)", false)
    .option("--dry-run", "Resolve, validate, and print the action plan without executing", false)
    .addHelpText("after", `
Examples:
  hassio call-service light turn_on --entity-id light.kitchen --data '{"brightness":128}'
  hassio call-service weather get_forecasts --entity-id weather.home --data '{"type":"daily"}'
  hassio call-service light turn_on --transport websocket --area-id kitchen --response never
  hassio call-service light turn_on --target '{"label_id":["evening"]}' --dry-run --strict-input

Response mode "auto" requests data only when the live service schema marks it
required. Every successful execution returns the same envelope across REST and
WebSocket. Dry runs are allowed in read-only mode and never execute the action.
`);

  command.action(withExit(async (
    domain: string,
    service: string,
    options: ServiceActionOptions,
    cmd,
  ) => {
    const { config, format } = resolveCommandOptions(cmd.optsWithGlobals());
    if (config.readOnly && !options.dryRun) {
      const path = options.transport === "rest"
        ? `/services/${domain}/${service}`
        : "/websocket/call_service";
      throw new HomeAssistantReadOnlyError(options.transport === "rest" ? "POST" : "WEBSOCKET", path);
    }
    const actions = new HomeAssistantServiceActionClient(config);
    const rawData = options.data ?? (options.dataFile ? await readFile(options.dataFile, "utf8") : undefined);
    const data = rawData ? parseObject(rawData, "Service data") : {};
    const target = parseTarget(options.target);
    const selectors = {
      entity_id: parseIds(options.entityId),
      device_id: parseIds(options.deviceId),
      area_id: parseIds(options.areaId),
      floor_id: parseIds(options.floorId),
      label_id: parseIds(options.labelId),
    };
    for (const [key, value] of Object.entries(selectors)) {
      if (value) target[key] = value;
    }

    const definition = findServiceDefinition(await actions.getServices(), domain, service);
    const capability = responseCapability(definition);
    const responseRequested = options.returnResponse === true
      || options.response === "always"
      || (options.response === "auto" && capability === "required");
    const validationData = options.transport === "rest" ? { ...data, ...target } : data;
    const validation = validateServiceData(definition, validationData, options.strictInput);
    const targetIsSupported = Object.keys(target).length === 0 || !definition || Boolean(definition.target);
    if (!targetIsSupported) {
      validation.ok = false;
      validation.errors.push(`Service action '${domain}.${service}' does not accept a target`);
    }
    if (!targetIsSupported && !options.dryRun) {
      throw new Error(validation.errors.at(-1));
    }
    if ((options.validateInput || options.strictInput) && !validation.ok && !options.dryRun) {
      throw new Error(`Service input validation failed: ${validation.errors.join("; ")}`);
    }
    if ((options.validateInput || options.strictInput) && validation.warnings.length > 0) {
      console.error(`WARN: ${validation.warnings.join("; ")}`);
    }
    if (options.response === "never" && capability === "required" && !options.dryRun) {
      throw new Error("This service action requires response data; use --response auto or always");
    }

    const base = {
      operation: "service_action" as const,
      transport: options.transport,
      domain,
      service,
      response_capability: capability,
      response_requested: responseRequested,
    };
    if (options.dryRun) {
      console.log(formatOutput({
        ...base,
        operation: "service_action_plan",
        executable: !config.readOnly && validation.ok && !(options.response === "never" && capability === "required"),
        read_only: config.readOnly,
        request: {
          service_data: data,
          target,
          return_response: responseRequested,
        },
        validation: validation as ServiceDataValidationResult,
      }, format));
      return;
    }

    if (options.transport === "rest") {
      const result = await actions.executeRest({
        domain,
        service,
        serviceData: data,
        target,
        returnResponse: responseRequested,
      });
      console.log(formatOutput(normalizeRestResult(result, base), format));
      return;
    }

    const result = await actions.executeWebSocket({
      domain,
      service,
      serviceData: data,
      target,
      returnResponse: responseRequested,
    });
    console.log(formatOutput(normalizeWebSocketResult(result, base), format));
  }));

  return command;
}
