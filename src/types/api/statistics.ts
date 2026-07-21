/**
 * Defines type-safe statistics contracts used by the Home Assistant API and CLI.
 */
export interface HaStatistics {
  [statisticId: string]: HaStatisticData[];
}

export interface HaStatisticData {
  start: string;
  end: string;
  mean?: number;
  min?: number;
  max?: number;
  last_reset?: string;
  state?: number;
  sum?: number;
}

export interface HaStatisticsDuringPeriod {
  [statisticId: string]: HaStatisticDuringPeriodData[];
}

export interface HaStatisticDuringPeriodData {
  start: string;
  end: string;
  change?: number;
  last_reset?: string;
  max?: number;
  mean?: number;
  min?: number;
  state?: number;
  sum?: number;
}

export interface HaStatisticMetadataItem {
  statistic_id: string;
  source?: string;
  unit_of_measurement?: string;
  has_mean?: boolean;
  has_sum?: boolean;
  name?: string;
}
