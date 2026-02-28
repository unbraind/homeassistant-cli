import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { StatisticsApiClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new StatisticsApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createStatisticsCommand(): Command {
  const command = new Command("statistics")
    .description("Query Home Assistant statistics data")
    .option("-e, --entity-id <entities>", "Entity ID(s), comma-separated")
    .option("-s, --start-time <timestamp>", "Start time (ISO format)")
    .option("-t, --end-time <timestamp>", "End time (ISO format)")
    .option("-p, --period <period>", "Period (5minute, hour, day, week, month)", "hour")
    .option("--types <types>", "Statistics types (comma-separated: change,last_reset,max,mean,min,state,sum)")
    .option("--during-period", "Query during a specific period", false);

  command.action(async (options: {
    entityId?: string;
    startTime?: string;
    endTime?: string;
    period?: "5minute" | "hour" | "day" | "week" | "month";
    types?: string;
    duringPeriod?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

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
      
      result = await client.getStatisticsDuringPeriod({
        startTime: options.startTime,
        endTime: options.endTime,
        statisticIds: entityIds,
        period: options.period,
        types,
      });
    } else {
      result = await client.getStatistics({
        statisticIds: entityIds,
        startTime: options.startTime,
        endTime: options.endTime,
        period: options.period,
      });
    }

    console.log(formatOutput(result, format));
  });

  return command;
}
