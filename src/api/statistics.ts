import type { Config } from "../types/options.js";
import type {
  HaStatistics,
  HaStatisticsDuringPeriod,
  HaStatisticMetadataItem,
} from "../types/api.js";
import { HomeAssistantClient } from "./client.js";

export class StatisticsApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getStatistics(options: {
    statisticIds?: string[];
    startTime?: string;
    endTime?: string;
    period?: "5minute" | "hour" | "day" | "week" | "month";
  } = {}): Promise<HaStatistics> {
    const body: Record<string, unknown> = {};
    if (options.statisticIds) body["statistic_ids"] = options.statisticIds;
    if (options.startTime) body["start_time"] = options.startTime;
    if (options.endTime) body["end_time"] = options.endTime;
    if (options.period) body["period"] = options.period;
    return this.request<HaStatistics>("POST", "/statistics", body);
  }

  async getStatisticsDuringPeriod(options: {
    startTime: string;
    endTime: string;
    statisticIds: string[];
    period?: "5minute" | "hour" | "day" | "week" | "month";
    types?: ("change" | "last_reset" | "max" | "mean" | "min" | "state" | "sum")[];
  }): Promise<HaStatisticsDuringPeriod> {
    const body: Record<string, unknown> = {
      start_time: options.startTime,
      end_time: options.endTime,
      statistic_ids: options.statisticIds,
    };
    if (options.period) body["period"] = options.period;
    if (options.types) body["types"] = options.types;
    return this.request<HaStatisticsDuringPeriod>("POST", "/statistics/during_period", body);
  }

  async getStatisticsMetadata(): Promise<HaStatisticMetadataItem[]> {
    return this.request<HaStatisticMetadataItem[]>("GET", "/statistics/metadata");
  }
}
