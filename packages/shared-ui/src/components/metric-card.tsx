import type { StatCardProps } from './stat-card';
import { StatCard } from './stat-card';

export interface MetricCardProps extends StatCardProps {}

/** Re-export StatCard as MetricCard for semantic dashboard structure */
export function MetricCard(props: MetricCardProps) {
  return <StatCard {...props} />;
}
