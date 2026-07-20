export type ChartPoint = { name: string; value: number; secondary?: number };

export interface AtlasChartProps {
  data: ChartPoint[];
  height?: number;
  pending?: boolean;
  pendingLabel?: string;
  ariaLabel?: string;
  color?: string;
  secondaryColor?: string;
  showGrid?: boolean;
}
