/**
 * Defines the typed related-resource topology command surface.
 */
import { Command } from "commander";
import { DiagnosticsApiClient } from "../api/diagnostics.js";
import { formatOutput } from "../formatters/index.js";
import { HA_RELATED_ITEM_TYPES } from "../types/api.js";
import type { HaRelatedItemType, HaRelatedResources } from "../types/api.js";
import { parseLimit, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

interface RelatedOptions {
  count?: boolean;
  limit: string;
  resultType?: HaRelatedItemType;
}

function projectRelatedResources(
  related: HaRelatedResources,
  resultType: HaRelatedItemType | undefined,
  limit: number,
): { count: number; by_type: Array<{ type: string; count: number }>; related: HaRelatedResources } {
  const projected: HaRelatedResources = {};
  const byType: Array<{ type: string; count: number }> = [];
  for (const type of HA_RELATED_ITEM_TYPES) {
    if (resultType && type !== resultType) continue;
    const rows = [...(related[type] ?? [])].sort();
    if (rows.length === 0) continue;
    byType.push({ type, count: rows.length });
    projected[type] = rows.slice(0, limit);
  }
  return {
    count: byType.reduce((total, entry) => total + entry.count, 0),
    by_type: byType,
    related: projected,
  };
}

/** Build the typed Home Assistant related-resource topology command. */
export function createRelatedCommand(): Command {
  const command = new Command("related")
    .description("Find Home Assistant resources related to an entity, device, area, or configuration item")
    .argument(`<item-type>`, `Resource type: ${HA_RELATED_ITEM_TYPES.join("|")}`)
    .argument("<item-id>", "Resource identifier")
    .option("--result-type <type>", "Return only one related resource type")
    .option("--limit <n>", "Maximum identifiers returned per resource type", "50")
    .option("--count", "Return counts without resource identifiers")
    .addHelpText("after", `
Examples:
  hassio related entity light.kitchen
  hassio related device <device-id> --result-type automation --limit 20
  hassio related area kitchen --count --format json-compact

The result is Home Assistant's topology-aware search projection, not a text
search. Use registry identifiers and treat returned identifiers as private.
`);

  command.action(withExit(async (
    itemTypeValue: string,
    itemIdValue: string,
    options: RelatedOptions,
    cmd,
  ) => {
    if (!HA_RELATED_ITEM_TYPES.includes(itemTypeValue as HaRelatedItemType)) {
      throw new Error(`Unsupported item type '${itemTypeValue}'. Valid values: ${HA_RELATED_ITEM_TYPES.join(", ")}`);
    }
    if (options.resultType && !HA_RELATED_ITEM_TYPES.includes(options.resultType)) {
      throw new Error(`Unsupported result type '${options.resultType}'. Valid values: ${HA_RELATED_ITEM_TYPES.join(", ")}`);
    }
    const itemId = itemIdValue.trim();
    if (!itemId) throw new Error("Item ID must not be empty");
    const limit = parseLimit(options.limit) as number;
    const { config, format } = resolveCommandOptions(cmd.optsWithGlobals());
    const client = new DiagnosticsApiClient(config);
    try {
      const result = projectRelatedResources(
        await client.getRelatedResources(itemTypeValue as HaRelatedItemType, itemId),
        options.resultType,
        limit,
      );
      console.log(formatOutput({
        query: { item_type: itemTypeValue, item_id: itemId },
        count: result.count,
        by_type: result.by_type,
        ...(options.count ? {} : { related: result.related }),
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}
