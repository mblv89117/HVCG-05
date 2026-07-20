import { makeStyles, tokens, Text, Caption1 } from '@fluentui/react-components';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { chartPalette, color } from '../tokens';
import { EmptyState } from './EmptyState';
import type { AtlasChartProps, ChartPoint } from './AtlasChartTypes';

export type { AtlasChartProps, ChartPoint } from './AtlasChartTypes';

const useStyles = makeStyles({
  wrap: {
    width: '100%',
    minHeight: '200px',
  },
  tooltip: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: '8px 10px',
    boxShadow: '0 8px 24px rgba(11, 31, 51, 0.12)',
  },
});

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  const s = useStyles();
  if (!active || !payload?.length) return null;
  return (
    <div className={s.tooltip}>
      <Caption1>{label}</Caption1>
      {payload.map((p) => (
        <Text key={p.name} size={300} weight="semibold" style={{ display: 'block' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </Text>
      ))}
    </div>
  );
}

function PendingChart({ label }: { label: string }) {
  return (
    <EmptyState
      title="Chart awaiting verified data"
      description={label}
    />
  );
}

function hasSignal(data: ChartPoint[]) {
  return data.some((d) => d.value !== 0 || (d.secondary ?? 0) !== 0);
}

export function AtlasAreaChart({
  data,
  height = 240,
  pending,
  pendingLabel = 'Connect a verified source to render this series.',
  ariaLabel = 'Area chart',
  color: stroke = chartPalette.azure,
  showGrid = true,
}: AtlasChartProps) {
  const s = useStyles();
  if (pending || !hasSignal(data)) return <PendingChart label={pendingLabel} />;
  return (
    <div className={s.wrap} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="atlasAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {showGrid ? <CartesianGrid strokeDasharray="3 6" stroke={color.fog} vertical={false} /> : null}
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: color.slateMuted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: color.slateMuted }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" name="Value" stroke={stroke} fill="url(#atlasAreaFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AtlasLineChart({
  data,
  height = 240,
  pending,
  pendingLabel = 'Connect a verified source to render this series.',
  ariaLabel = 'Line chart',
  color: stroke = chartPalette.navy,
  secondaryColor = chartPalette.gold,
  showGrid = true,
}: AtlasChartProps) {
  const s = useStyles();
  if (pending || !hasSignal(data)) return <PendingChart label={pendingLabel} />;
  return (
    <div className={s.wrap} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {showGrid ? <CartesianGrid strokeDasharray="3 6" stroke={color.fog} vertical={false} /> : null}
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: color.slateMuted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: color.slateMuted }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="value" name="Primary" stroke={stroke} strokeWidth={2.25} dot={false} />
          {data.some((d) => d.secondary != null) ? (
            <Line type="monotone" dataKey="secondary" name="Secondary" stroke={secondaryColor} strokeWidth={2} dot={false} />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AtlasBarChart({
  data,
  height = 240,
  pending,
  pendingLabel = 'Connect a verified source to render this series.',
  ariaLabel = 'Bar chart',
  color: fill = chartPalette.gold,
  showGrid = true,
}: AtlasChartProps) {
  const s = useStyles();
  if (pending || !hasSignal(data)) return <PendingChart label={pendingLabel} />;
  return (
    <div className={s.wrap} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {showGrid ? <CartesianGrid strokeDasharray="3 6" stroke={color.fog} vertical={false} /> : null}
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: color.slateMuted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: color.slateMuted }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Value" fill={fill} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AtlasDonutChart({
  data,
  height = 220,
  pending,
  pendingLabel = 'Connect a verified source to render this series.',
  ariaLabel = 'Donut chart',
}: AtlasChartProps) {
  const s = useStyles();
  if (pending || !hasSignal(data)) return <PendingChart label={pendingLabel} />;
  return (
    <div className={s.wrap} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={chartPalette.soft[i % chartPalette.soft.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

