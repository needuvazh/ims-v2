import { context as otelContext, trace, SpanStatusCode } from '@opentelemetry/api';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { HeaderBag, RequestContext, RequestContextInput } from './request-context';
import { applyRequestContextHeaders, createRequestContext } from './request-context';
import { createStructuredLogger } from './logger';

type AsyncWork<T> = () => T | Promise<T>;

type RequestErrorContext = {
  routerKind: 'Pages Router' | 'App Router';
  routePath: string;
  routeType: 'render' | 'route' | 'action' | 'proxy';
  renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
  revalidateReason?: 'on-demand' | 'stale' | undefined;
  renderType?: 'dynamic' | 'dynamic-resume';
};

let registrationPromise: Promise<void> | null = null;
const requestContextStore = new AsyncLocalStorage<RequestContext>();

function hasExporterConfiguration(): boolean {
  return Boolean(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  );
}

function resolveActiveTraceId(): string | null {
  const activeSpan = trace.getSpan(otelContext.active());
  const traceId = activeSpan?.spanContext().traceId ?? null;
  if (!traceId || traceId === '00000000000000000000000000000000') {
    return null;
  }

  return traceId;
}

export function createCurrentRequestContext(source?: HeaderBag, overrides: RequestContextInput = {}): RequestContext {
  const context = createRequestContext(source, overrides);
  return {
    ...context,
    traceId: overrides.traceId ?? context.traceId ?? resolveActiveTraceId(),
  };
}

export function getCurrentRequestContext(): RequestContext | null {
  return requestContextStore.getStore() ?? null;
}

export function getCurrentRequestLogger() {
  return createStructuredLogger(getCurrentRequestContext() ?? {});
}

export function runWithRequestContext<T>(context: RequestContext, work: AsyncWork<T>): T | Promise<T> {
  return requestContextStore.run(context, work);
}

export function withRequestContextFromHeaders<T>(
  source: HeaderBag,
  work: AsyncWork<T>,
  overrides: RequestContextInput = {},
): T | Promise<T> {
  return runWithRequestContext(createCurrentRequestContext(source, overrides), work);
}

async function createTelemetrySdk() {
  const [{ NodeSDK }, { OTLPTraceExporter }, { OTLPMetricExporter }, { PeriodicExportingMetricReader }, { getNodeAutoInstrumentations }] =
    await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/exporter-metrics-otlp-http'),
      import('@opentelemetry/sdk-metrics'),
      import('@opentelemetry/auto-instrumentations-node'),
    ]);

  const traceExporter = new OTLPTraceExporter();
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  });

  return new NodeSDK({
    traceExporter,
    metricReader: metricReader as never,
    instrumentations: [getNodeAutoInstrumentations()],
  });
}

export async function registerObservability(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    if (!hasExporterConfiguration()) {
      return;
    }

    const sdk = await createTelemetrySdk();
    await sdk.start();
  })();

  return registrationPromise;
}

function logRequestError(
  error: Error,
  request: { path: string; method: string; headers: HeaderBag },
  context: RequestErrorContext,
): void {
  const requestContext = createCurrentRequestContext(request.headers, {
    route: context.routePath,
    method: request.method,
    status: 'error',
  });
  const logger = createStructuredLogger(requestContext);
  logger.error('next.request.error', {
    routeType: context.routeType,
    routerKind: context.routerKind,
    digest: (error as Error & { digest?: string }).digest ?? null,
    message: error.message,
    error,
  });

  const span = trace.getSpan(otelContext.active());
  if (span) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
}

export async function reportRequestError(
  error: Error,
  request: { path: string; method: string; headers: HeaderBag },
  context: RequestErrorContext,
): Promise<void> {
  logRequestError(error, request, context);
}

export { applyRequestContextHeaders, createStructuredLogger, createRequestContext };
export type { HeaderBag, RequestContext, RequestContextInput };
