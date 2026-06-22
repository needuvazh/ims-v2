import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCurrentRequestContext, getCurrentRequestContext, reportRequestError, withRequestContextFromHeaders } from './node';

describe('node observability helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs work inside a request context', async () => {
    await withRequestContextFromHeaders(
      new Headers({
        'x-request-id': 'req-42',
      }),
      async () => {
        expect(getCurrentRequestContext()?.requestId).toBe('req-42');
      },
    );
  });

  it('prefers an active trace id when building current context', () => {
    const context = createCurrentRequestContext(new Headers({
      'x-request-id': 'req-1',
    }));

    expect(context.requestId).toBe('req-1');
  });

  it('reports request errors through the structured logger', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await reportRequestError(
      new Error('boom'),
      {
        path: '/api/test',
        method: 'GET',
        headers: new Headers({
          'x-request-id': 'req-99',
        }),
      },
      {
        routerKind: 'App Router',
        routePath: '/api/test',
        routeType: 'route',
      },
    );

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.event).toBe('next.request.error');
    expect(payload.requestId).toBe('req-99');
    expect(payload.routeType).toBe('route');
    expect(payload.error.message).toBe('boom');
  });
});
