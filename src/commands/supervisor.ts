import { Command } from "commander";
import { SupervisorApiClient } from "../api/supervisor.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function parseJson(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return JSON.parse(value) as Record<string, unknown>;
}

async function runSupervisorAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/401/.test(message)) {
      throw new Error(
        `${message}. Supervisor API requires Home Assistant OS/Supervised and a token with supervisor access.`
      );
    }
    if (/404/.test(message)) {
      throw new Error(
        `${message}. Supervisor API is unavailable on this installation (common on Home Assistant Container/Core).`
      );
    }
    throw error;
  }
}

export function createSupervisorCommand(): Command {
  const cmd = new Command("supervisor")
    .description("Access Home Assistant Supervisor API proxy endpoints");

  cmd.addCommand(createSupervisorApiCommand());
  cmd.addCommand(createSupervisorAddonsCommand());
  cmd.addCommand(createSupervisorHostCommand());
  cmd.addCommand(createSupervisorLogsCommand());

  return cmd;
}

function createSupervisorApiCommand(): Command {
  const cmd = new Command("api")
    .description("Raw supervisor proxy passthrough for full endpoint coverage")
    .requiredOption("-m, --method <method>", "HTTP method: GET|POST|PUT|PATCH|DELETE")
    .option("-p, --path <path>", "Supervisor path, e.g. /addons or /addons/core_ssh/info")
    .option("--endpoint <path>", "Alias for --path")
    .option("-d, --data <json>", "JSON body for write methods");

  cmd.action(withExit(async (options: { method: string; path?: string; endpoint?: string; data?: string }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new SupervisorApiClient(config);
    const method = options.method.toUpperCase() as HttpMethod;
    const endpointPath = options.endpoint ?? options.path;

    const allowed: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    if (!allowed.includes(method)) {
      throw new Error(`Invalid method '${options.method}'. Use one of: ${allowed.join(", ")}`);
    }
    if (!endpointPath) {
      throw new Error("Supervisor path is required. Use --path or --endpoint.");
    }

    const result = await runSupervisorAction(() => client.proxy(method, endpointPath, parseJson(options.data)));
    console.log(formatOutput(result, format));
  }));

  return cmd;
}

function createSupervisorAddonsCommand(): Command {
  const cmd = new Command("addons")
    .description("Supervisor add-on operations")
    .option("--list", "List installed add-ons")
    .option("--info <slug>", "Get add-on info")
    .option("--start <slug>", "Start add-on")
    .option("--stop <slug>", "Stop add-on")
    .option("--restart <slug>", "Restart add-on");

  cmd.action(withExit(async (options: {
    list?: boolean;
    info?: string;
    start?: string;
    stop?: string;
    restart?: string;
  }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new SupervisorApiClient(config);

    if (options.info) {
      console.log(formatOutput(await runSupervisorAction(() => client.getAddonInfo(options.info as string)), format));
      return;
    }
    if (options.start) {
      console.log(formatOutput(await runSupervisorAction(() => client.addonStart(options.start as string)), format));
      return;
    }
    if (options.stop) {
      console.log(formatOutput(await runSupervisorAction(() => client.addonStop(options.stop as string)), format));
      return;
    }
    if (options.restart) {
      console.log(formatOutput(await runSupervisorAction(() => client.addonRestart(options.restart as string)), format));
      return;
    }

    if (options.list || (!options.info && !options.start && !options.stop && !options.restart)) {
      console.log(formatOutput(await runSupervisorAction(() => client.getAddons()), format));
      return;
    }
  }));

  return cmd;
}

function createSupervisorHostCommand(): Command {
  const cmd = new Command("host")
    .description("Supervisor host operations")
    .option("--reboot", "Reboot host")
    .option("--shutdown", "Shutdown host");

  cmd.action(withExit(async (options: { reboot?: boolean; shutdown?: boolean }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new SupervisorApiClient(config);

    if (options.reboot) {
      console.log(formatOutput(await runSupervisorAction(() => client.hostReboot()), format));
      return;
    }

    if (options.shutdown) {
      console.log(formatOutput(await runSupervisorAction(() => client.hostShutdown()), format));
      return;
    }

    command.help();
  }));

  return cmd;
}

function createSupervisorLogsCommand(): Command {
  return new Command("logs")
    .description("Fetch supervisor logs")
    .action(withExit(async (_options, command) => {
      const globalOpts = command.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new SupervisorApiClient(config);
      console.log(formatOutput(await runSupervisorAction(() => client.getSupervisorLogs()), format));
    }));
}
