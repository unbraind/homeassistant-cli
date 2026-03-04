import { Command } from "commander";
import { HomeAssistantApiError, StatisticsApiClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createStatisticsCommand(): Command {
  const command = new Command("statistics")
    .description("Query Home Assistant statistics data")
    .option("-e, --entity-id <entities>", "Entity ID(s), comma-separated")
    .option("-s, --start-time <timestamp>", "Start time (ISO format)")
    .option("--end-time <timestamp>", "End time (ISO format)")
    .option("-p, --period <period>", "Period (5minute, hour, day, week, month)", "hour")
    .option("--types <types>", "Statistics types (comma-separated: change,last_reset,max,mean,min,state,sum)")
    .option("--during-period", "Query during a specific period", false)
    .option("--metadata", "Return statistics metadata")
    .option("--count", "Only return count for metadata/results");

  command.action(withExit(async (options: {
    entityId?: string;
    startTime?: string;
    endTime?: string;
    period?: "5minute" | "hour" | "day" | "week" | "month";
    types?: string;
    duringPeriod?: boolean;
    metadata?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new StatisticsApiClient(config);

    if (options.metadata) {
      try {
        const metadata = await client.getStatisticsMetadata();
        if (options.count) {
          console.log(formatOutput({ statistics_metadata_count: metadata.length }, format));
        } else {
          console.log(formatOutput({ statistics_metadata: metadata }, format));
        }
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({
            statistics_metadata: [],
            message: "Statistics metadata endpoint not available on this Home Assistant instance.",
          }, format));
        } else {
          throw error;
        }
      }
      return;
    }

    if (!options.entityId) {
      console.error("Entity ID(s) required. Use -e or --entity-id option.");
      process.exit(1);
    }

    const entityIds = options.entityId.split(",").map(e => e.trim());

    let result;
    
    if (options.duringPeriod) {
      if (!options.startTime || !options.endTime) {
        console.error("Start and end time required for during_period query.");
        process.exit(1);
      }
      
      const types = options.types ? options.types.split(",") as ("change" | "last_reset" | "max" | "mean" | "min" | "state" | "sum")[] : undefined;
      
      const periodOptions: { startTime: string; endTime: string; statisticIds: string[]; period?: "5minute" | "hour" | "day" | "week" | "month"; types?: ("change" | "last_reset" | "max" | "mean" | "min" | "state" | "sum")[] } = {
        startTime: options.startTime,
        endTime: options.endTime,
        statisticIds: entityIds,
      };
      if (options.period) periodOptions.period = options.period;
      if (types) periodOptions.types = types;
      
      result = await client.getStatisticsDuringPeriod(periodOptions);
    } else {
      const statsOptions: { statisticIds?: string[]; startTime?: string; endTime?: string; period?: "5minute" | "hour" | "day" | "week" | "month" } = {
        statisticIds: entityIds,
      };
      if (options.startTime) statsOptions.startTime = options.startTime;
      if (options.endTime) statsOptions.endTime = options.endTime;
      if (options.period) statsOptions.period = options.period;
      
      result = await client.getStatistics(statsOptions);
    }

    if (options.count) {
      const count = Object.values(result).reduce(
        (acc, rows) => acc + (Array.isArray(rows) ? rows.length : 0),
        0
      );
      console.log(formatOutput({ statistics_rows: count, statistic_ids: Object.keys(result).length }, format));
      return;
    }

    console.log(formatOutput(result, format));
  }));

  return command;
}
