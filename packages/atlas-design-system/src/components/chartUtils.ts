import type { ChartPoint } from './AtlasChartTypes';

export type { ChartPoint } from './AtlasChartTypes';

/** Build presentation series from spark arrays without inventing business values. */
export function seriesFromSpark(spark: number[], labels?: string[]): ChartPoint[] {
  return spark.map((value, i) => ({
    name: labels?.[i] ?? `P${i + 1}`,
    value,
  }));
}
