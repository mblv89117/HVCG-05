import { lazy, Suspense, type ComponentProps } from 'react';
import { LoadingState } from './EmptyState';

const Area = lazy(() => import('./AtlasChart').then((m) => ({ default: m.AtlasAreaChart })));
const Line = lazy(() => import('./AtlasChart').then((m) => ({ default: m.AtlasLineChart })));
const Bar = lazy(() => import('./AtlasChart').then((m) => ({ default: m.AtlasBarChart })));
const Donut = lazy(() => import('./AtlasChart').then((m) => ({ default: m.AtlasDonutChart })));

function ChartFallback() {
  return <LoadingState rows={3} />;
}

export function LazyAreaChart(props: ComponentProps<typeof Area>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Area {...props} />
    </Suspense>
  );
}

export function LazyLineChart(props: ComponentProps<typeof Line>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Line {...props} />
    </Suspense>
  );
}

export function LazyBarChart(props: ComponentProps<typeof Bar>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Bar {...props} />
    </Suspense>
  );
}

export function LazyDonutChart(props: ComponentProps<typeof Donut>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Donut {...props} />
    </Suspense>
  );
}
