export type MetricValue = {
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
};

export interface IMetrics {
  increment(metricName: string, labels?: Record<string, string>): void;
  timing(metricName: string, ms: number, labels?: Record<string, string>): void;
}

export class InMemoryMetrics implements IMetrics {
  private static instance: InMemoryMetrics;
  private counters = new Map<string, MetricValue[]>();
  private gauges = new Map<string, MetricValue>();
  private timings = new Map<string, MetricValue[]>();

  private constructor() {}

  static getInstance(): InMemoryMetrics {
    if (!InMemoryMetrics.instance) {
      InMemoryMetrics.instance = new InMemoryMetrics();
    }
    return InMemoryMetrics.instance;
  }

  increment(metricName: string, valueOrLabels: number | Record<string, string> = 1, tags: Record<string, string> = {}): void {
    const value = typeof valueOrLabels === 'number' ? valueOrLabels : 1;
    const finalTags = typeof valueOrLabels === 'number' ? tags : valueOrLabels;
    const list = this.counters.get(metricName) || [];
    list.push({
      value,
      tags: finalTags,
      timestamp: new Date(),
    });
    this.counters.set(metricName, list);

    // Also output log for structured tracing in dev/test/production
    console.debug(`[Metric-Counter] ${metricName} +${value} tags=${JSON.stringify(finalTags)}`);
  }

  timing(metricName: string, ms: number, labels: Record<string, string> = {}): void {
    const list = this.timings.get(metricName) || [];
    list.push({
      value: ms,
      tags: labels,
      timestamp: new Date(),
    });
    this.timings.set(metricName, list);

    console.debug(`[Metric-Timing] ${metricName} ${ms}ms tags=${JSON.stringify(labels)}`);
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

  getTimingValues(metricName: string): MetricValue[] {
    return this.timings.get(metricName) || [];
  }

  snapshot(): {
    counters: Record<string, MetricValue[]>;
    gauges: Record<string, MetricValue>;
    timings: Record<string, MetricValue[]>;
  } {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
      timings: Object.fromEntries(this.timings.entries()),
    };
  }

  clear(): void {
    this.counters.clear();
    this.gauges.clear();
  }
}
