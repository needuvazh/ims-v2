import { createRequestContext, type HeaderBag, type RequestContext, type RequestContextInput } from './request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogDetails = {
  action?: string | null;
  branchId?: string | null;
  code?: string | null;
  count?: number | null;
  digest?: string | null;
  durationMs?: number | null;
  entityId?: string | null;
  entityType?: string | null;
  auditId?: string | null;
  exportJobId?: string | null;
  dashboardType?: string | null;
  reportType?: string | null;
  permissionId?: string | null;
  roleId?: string | null;
  sessionId?: string | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  message?: string | null;
  method?: string | null;
  reason?: string | null;
  requestId?: string | null;
  route?: string | null;
  routeType?: string | null;
  routerKind?: string | null;
  status?: string | null;
  traceId?: string | null;
  userId?: string | null;
  error?: Error | null;
};

export type StructuredLogger = {
  debug(event: string, details?: LogDetails): void;
  info(event: string, details?: LogDetails): void;
  warn(event: string, details?: LogDetails): void;
  error(event: string, details?: LogDetails): void;
};

export type ILogger = StructuredLogger;

const allowedDetailKeys: ReadonlySet<keyof Omit<LogDetails, 'error'>> = new Set([
  'action',
  'branchId',
  'code',
  'count',
  'digest',
  'durationMs',
  'entityId',
  'entityType',
  'message',
  'method',
  'reason',
  'requestId',
  'route',
  'routeType',
  'routerKind',
  'status',
  'traceId',
  'userId',
]);

function serializeError(error: Error | null | undefined): Record<string, string> | null {
  if (!error) {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack ?? '',
  };
}

function selectSink(level: LogLevel): (message: string) => void {
  if (level === 'error') {
    return console.error.bind(console);
  }

  if (level === 'warn') {
    return console.warn.bind(console);
  }

  if (level === 'debug' && typeof console.debug === 'function') {
    return console.debug.bind(console);
  }

  return console.info.bind(console);
}

function mergeContext(baseContext: Partial<RequestContext>, details?: LogDetails): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    requestId: details?.requestId ?? baseContext.requestId,
    traceId: details?.traceId ?? baseContext.traceId ?? undefined,
    userId: details?.userId ?? baseContext.userId ?? undefined,
    branchId: details?.branchId ?? baseContext.branchId ?? undefined,
    route: details?.route ?? baseContext.route ?? undefined,
    action: details?.action ?? baseContext.action ?? undefined,
    method: details?.method ?? baseContext.method ?? undefined,
    status: details?.status ?? baseContext.status ?? undefined,
  };

  for (const [key, value] of Object.entries(details ?? {})) {
    if (key === 'error' || !allowedDetailKeys.has(key as keyof Omit<LogDetails, 'error'>)) {
      continue;
    }

    if (value !== null && value !== undefined) {
      entry[key] = value;
    }
  }

  return entry;
}

function writeLog(level: LogLevel, event: string, baseContext: Partial<RequestContext>, details?: LogDetails): void {
  const sink = selectSink(level);
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...mergeContext(baseContext, details),
    error: serializeError(details?.error ?? null),
  };

  sink(JSON.stringify(entry));
}

export function createStructuredLogger(baseContext: Partial<RequestContext> = {}) : StructuredLogger {
  return {
    debug(event: string, details?: LogDetails) {
      writeLog('debug', event, baseContext, details);
    },
    info(event: string, details?: LogDetails) {
      writeLog('info', event, baseContext, details);
    },
    warn(event: string, details?: LogDetails) {
      writeLog('warn', event, baseContext, details);
    },
    error(event: string, details?: LogDetails) {
      writeLog('error', event, baseContext, details);
    },
  };
}

export class ConsoleStructuredLogger implements ILogger {
  constructor(private readonly baseContext: Partial<RequestContext> = {}) {}

  debug(event: string, details?: LogDetails): void {
    writeLog('debug', event, this.baseContext, details);
  }

  info(event: string, details?: LogDetails): void {
    writeLog('info', event, this.baseContext, details);
  }

  warn(event: string, details?: LogDetails): void {
    writeLog('warn', event, this.baseContext, details);
  }

  error(event: string, details?: LogDetails): void {
    writeLog('error', event, this.baseContext, details);
  }
}

export function createStructuredLoggerFromHeaders(source: HeaderBag, overrides: RequestContextInput = {}): StructuredLogger {
  return createStructuredLogger(createRequestContext(source, overrides));
}
