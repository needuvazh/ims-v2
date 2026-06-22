import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyRequestContextHeaders, createRequestContext, createRequestId, extractTraceId, requestHeaderNames } from './request-context';
import { createStructuredLogger } from './logger';

describe('observability request context', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers explicit request and trace headers', () => {
    const context = createRequestContext({
      get(name) {
        if (name === requestHeaderNames.requestId) {
          return 'req-123';
        }

        if (name === requestHeaderNames.traceParent) {
          return '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01';
        }

        return null;
      },
    });

    expect(context.requestId).toBe('req-123');
    expect(context.traceId).toBe('0123456789abcdef0123456789abcdef');
  });

  it('writes request and correlation headers consistently', () => {
    const headers = new Headers();
    applyRequestContextHeaders(headers, {
      requestId: 'req-1',
      traceId: 'trace-1',
    });

    expect(headers.get(requestHeaderNames.requestId)).toBe('req-1');
    expect(headers.get(requestHeaderNames.correlationId)).toBe('req-1');
    expect(headers.get(requestHeaderNames.traceId)).toBe('trace-1');
  });

  it('creates a stable request id when no headers are available', () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('extracts trace ids from traceparent values', () => {
    expect(extractTraceId({
      get(name) {
        if (name === requestHeaderNames.traceParent) {
          return '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01';
        }

        return null;
      },
    })).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('emits structured logs without leaking unknown fields', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createStructuredLogger({
      requestId: 'req-1',
      traceId: 'trace-1',
    });

    logger.info('observability.test', {
      route: '/api/health',
      status: 'success',
      message: 'ok',
      // Deliberately cast to verify the logger ignores unknown payloads.
      // @ts-expect-error - test the runtime sanitizer
      secret: 'should-not-appear',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.requestId).toBe('req-1');
    expect(payload.traceId).toBe('trace-1');
    expect(payload.route).toBe('/api/health');
    expect(payload.secret).toBeUndefined();
  });
});
