export type MetricValue = {
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
};

export class InMemoryMetrics {
  private static instance: InMemoryMetrics;
  private counters = new Map<string, MetricValue[]>();
  private gauges = new Map<string, MetricValue>();

  private constructor() {}

  static getInstance(): InMemoryMetrics {
    if (!InMemoryMetrics.instance) {
      InMemoryMetrics.instance = new InMemoryMetrics();
    }
    return InMemoryMetrics.instance;
  }

  increment(metricName: string, value: number = 1, tags: Record<string, string> = {}): void {
    const list = this.counters.get(metricName) || [];
    list.push({
      value,
      tags,
      timestamp: new Date(),
    });
    this.counters.set(metricName, list);

    // Also output log for structured tracing in dev/test/production
    console.debug(`[Metric-Counter] ${metricName} +${value} tags=${JSON.stringify(tags)}`);
  }

  setGauge(metricName: string, value: number, tags: Record<string, string> = {}): void {
    this.gauges.set(metricName, {
      value,
      tags,
      timestamp: new Date(),
    });

    console.debug(`[Metric-Gauge] ${metricName} = ${value} tags=${JSON.stringify(tags)}`);
  }

  getCounterValues(metricName: string): MetricValue[] {
    return this.counters.get(metricName) || [];
  }

  getGaugeValue(metricName: string): MetricValue | null {
    return this.gauges.get(metricName) || null;
  }

  clear(): void {
    this.counters.clear();
    this.gauges.clear();
  }
}
