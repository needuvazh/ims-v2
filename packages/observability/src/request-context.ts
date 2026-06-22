export interface HeaderSource {
  get(name: string): string | null | undefined;
}

export type HeaderBag =
  | Headers
  | HeaderSource
  | Record<string, string | string[] | undefined>
  | Readonly<Record<string, string | string[] | undefined>>
  | null
  | undefined;

export type RequestContext = {
  requestId: string;
  traceId: string | null;
  userId: string | null;
  branchId: string | null;
  route: string | null;
  action: string | null;
  method: string | null;
  status: string | null;
};

export type RequestContextInput = Partial<RequestContext>;

export const requestHeaderNames = {
  requestId: 'x-request-id',
  correlationId: 'x-correlation-id',
  traceId: 'x-trace-id',
  traceParent: 'traceparent',
  legacyRequestId: 'x-ims-request-id',
  legacyTraceId: 'x-ims-trace-id',
} as const;

function normalizeHeaderValue(value: string | string[] | undefined | null): string | null {
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.length > 0);
    return first ?? null;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value;
}

function getHeaderValue(source: HeaderBag, name: string): string | null {
  if (!source) {
    return null;
  }

  if (source instanceof Headers) {
    return normalizeHeaderValue(source.get(name));
  }

  if ('get' in source && typeof source.get === 'function') {
    return normalizeHeaderValue(source.get(name));
  }

  const lookupName = name.toLowerCase();

  for (const [key, value] of Object.entries(source)) {
    if (key.toLowerCase() === lookupName) {
      return normalizeHeaderValue(value);
    }
  }

  return null;
}

function parseTraceParent(traceParent: string): string | null {
  const parts = traceParent.trim().split('-');
  if (parts.length < 4) {
    return null;
  }

  const traceId = parts[1]?.toLowerCase();
  if (!traceId || traceId.length !== 32 || !/^[0-9a-f]+$/u.test(traceId)) {
    return null;
  }

  if (traceId === '00000000000000000000000000000000') {
    return null;
  }

  return traceId;
}

function fallbackRequestId(): string {
  const now = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `req_${now}_${random}`;
}

export function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? fallbackRequestId();
}

export function extractTraceId(source: HeaderBag): string | null {
  const explicitTraceId =
    getHeaderValue(source, requestHeaderNames.traceId) ??
    getHeaderValue(source, requestHeaderNames.legacyTraceId);
  if (explicitTraceId) {
    return explicitTraceId;
  }

  const traceParent = getHeaderValue(source, requestHeaderNames.traceParent);
  if (traceParent) {
    return parseTraceParent(traceParent);
  }

  return null;
}

export function extractRequestId(source: HeaderBag): string | null {
  return (
    getHeaderValue(source, requestHeaderNames.requestId) ??
    getHeaderValue(source, requestHeaderNames.correlationId) ??
    getHeaderValue(source, requestHeaderNames.legacyRequestId)
  );
}

export function createRequestContext(source?: HeaderBag, overrides: RequestContextInput = {}): RequestContext {
  const requestId = overrides.requestId ?? extractRequestId(source) ?? createRequestId();
  const traceId = overrides.traceId ?? extractTraceId(source);

  return {
    requestId,
    traceId,
    userId: overrides.userId ?? null,
    branchId: overrides.branchId ?? null,
    route: overrides.route ?? null,
    action: overrides.action ?? null,
    method: overrides.method ?? null,
    status: overrides.status ?? null,
  };
}

export function applyRequestContextHeaders(target: Headers, context: Pick<RequestContext, 'requestId' | 'traceId'>): void {
  target.set(requestHeaderNames.requestId, context.requestId);
  target.set(requestHeaderNames.correlationId, context.requestId);

  if (context.traceId) {
    target.set(requestHeaderNames.traceId, context.traceId);
  }
}
