/**
 * Defines typed, bounded Home Assistant frontend semantic discovery commands.
 */
import { Command, Option } from "commander";
import { callWebsocketAndOutput, formatBoundedRows, parseLimit } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type ListOptions = {
  all?: boolean;
  count?: boolean;
  integration?: string;
  key?: string;
  limit?: string;
};

type ThemeOptions = ListOptions & {
  includeValues?: boolean;
  name?: string;
};

const DOMAIN_PATTERN = /^[a-z0-9_]+$/;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/;
const CATEGORY_PATTERN = /^[a-z][a-z0-9_]*$/;
const ICON_CATEGORIES = ["conditions", "entity", "entity_component", "services", "triggers"];

function parseCsv(value?: string): string[] {
  return [...new Set(value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [])];
}

function parseIntegrations(value?: string): string[] {
  const integrations = parseCsv(value);
  const invalid = integrations.find((integration) => !DOMAIN_PATTERN.test(integration));
  if (invalid) {
    throw new Error(`Invalid integration domain '${invalid}'. Use lowercase letters, numbers, and underscores.`);
  }
  return integrations;
}

function validateListOptions(options: ListOptions): void {
  if (!options.all && !options.count) parseLimit(options.limit);
}

function resourceRows(result: unknown, prefix?: string): Record<string, unknown>[] {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const resources = (result as Record<string, unknown>)["resources"];
  if (!resources || typeof resources !== "object" || Array.isArray(resources)) return [];
  const pending = Object.entries(resources);
  const rows: Record<string, unknown>[] = [];
  while (pending.length > 0) {
    const [key, value] = pending.pop() as [string, unknown];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      pending.push(...Object.entries(value as Record<string, unknown>)
        .map(([childKey, childValue]) => [`${key}.${childKey}`, childValue] as [string, unknown]));
    } else if (!prefix || key.startsWith(prefix)) {
      rows.push({ key, value });
    }
  }
  return rows.sort((left, right) => String(left["key"]).localeCompare(String(right["key"]), "en"));
}

function addListOptions(command: Command): Command {
  return command
    .option("--limit <n>", "Maximum rows to return unless --all is set", "100")
    .option("--all", "Return every matching row")
    .option("--count", "Return only the matching row count");
}

function createVersionCommand(): Command {
  const command = new Command("version").description("Get the installed Home Assistant frontend version");
  command.action(withExit(async (_options, cmd) => {
    await callWebsocketAndOutput(cmd as Command, "frontend/get_version", undefined, (result) =>
      result && typeof result === "object" && !Array.isArray(result)
        ? result as Record<string, unknown>
        : { version: result });
  }));
  return command;
}

function createThemesCommand(): Command {
  const command = addListOptions(new Command("themes")
    .description("List installed frontend themes as bounded summaries")
    .option("--name <names>", "Comma-separated exact theme names to include")
    .option("--include-values", "Include theme variables in returned rows"));
  command.action(withExit(async (options: ThemeOptions, cmd) => {
    validateListOptions(options);
    const names = new Set(parseCsv(options.name));
    await callWebsocketAndOutput(cmd as Command, "frontend/get_themes", undefined, (result) => {
      const root = result && typeof result === "object" && !Array.isArray(result)
        ? result as Record<string, unknown>
        : {};
      const themes = root["themes"] && typeof root["themes"] === "object" && !Array.isArray(root["themes"])
        ? root["themes"] as Record<string, unknown>
        : {};
      const rows = Object.entries(themes)
        .filter(([name]) => names.size === 0 || names.has(name))
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([name, values]) => ({
          name,
          variable_count: values && typeof values === "object" && !Array.isArray(values)
            ? Object.keys(values).length
            : 0,
          ...(options.includeValues ? { values } : {}),
        }));
      const bounded = formatBoundedRows(rows, options, "themes");
      return options.count ? bounded : {
        default_theme: root["default_theme"] ?? null,
        default_dark_theme: root["default_dark_theme"] ?? null,
        ...bounded,
      };
    });
  }));
  return command;
}

function createIconsCommand(): Command {
  const command = addListOptions(new Command("icons")
    .description("List semantic icons for Home Assistant conditions, entities, services, or triggers")
    .addOption(new Option("--category <category>", "Official icon resource category").choices(ICON_CATEGORIES).makeOptionMandatory())
    .option("--integration <domains>", "Comma-separated integration domains to include"));
  command.action(withExit(async (options: ListOptions & { category: string }, cmd) => {
    validateListOptions(options);
    const integrations = parseIntegrations(options.integration);
    await callWebsocketAndOutput(cmd as Command, "frontend/get_icons", {
      category: options.category,
      ...(integrations.length > 0 ? { integration: integrations } : {}),
    }, (result) => ({
      category: options.category,
      integrations,
      ...formatBoundedRows(resourceRows(result), options, "icons"),
    }));
  }));
  return command;
}

function createTranslationsCommand(): Command {
  const command = addListOptions(new Command("translations")
    .description("List localized Home Assistant frontend resources as deterministic key/value rows")
    .requiredOption("--language <language>", "Language code such as en, de, or pt-BR")
    .requiredOption("--category <category>", "Translation category such as services, entity, or config")
    .option("--integration <domains>", "Comma-separated integration domains to include")
    .option("--config-flow", "Request config-flow translations")
    .option("--key <prefix>", "Return only resource keys with this prefix"));
  command.action(withExit(async (options: ListOptions & {
    category: string;
    configFlow?: boolean;
    language: string;
  }, cmd) => {
    validateListOptions(options);
    if (!LANGUAGE_PATTERN.test(options.language)) throw new Error(`Invalid language code '${options.language}'`);
    if (!CATEGORY_PATTERN.test(options.category)) throw new Error(`Invalid translation category '${options.category}'`);
    const integrations = parseIntegrations(options.integration);
    await callWebsocketAndOutput(cmd as Command, "frontend/get_translations", {
      language: options.language,
      category: options.category,
      ...(integrations.length > 0 ? { integration: integrations } : {}),
      ...(options.configFlow ? { config_flow: true } : {}),
    }, (result) => ({
      language: options.language,
      category: options.category,
      integrations,
      config_flow: options.configFlow ?? false,
      ...formatBoundedRows(resourceRows(result, options.key), options, "translations"),
    }));
  }));
  return command;
}

/** Build typed read-only frontend semantic discovery commands. */
export function createWebsocketFrontendCommand(): Command {
  const command = new Command("frontend")
    .description("Discover frontend version, themes, icons, and localized semantic resources")
    .addHelpText("after", `
Examples:
  hassio ws frontend version
  hassio ws frontend themes --limit 20
  hassio ws frontend icons --category services --integration light --limit 50
  hassio ws frontend translations --language en --category services --integration light --count
`);
  command.addCommand(createVersionCommand());
  command.addCommand(createThemesCommand());
  command.addCommand(createIconsCommand());
  command.addCommand(createTranslationsCommand());
  return command;
}
