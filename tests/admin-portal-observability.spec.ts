import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET as healthGET } from '../apps/admin-portal/app/api/health/route';
import { GET as signOutGET } from '../apps/admin-portal/app/sign-out/route';
import { middleware } from '../apps/admin-portal/middleware';

describe('admin portal observability integration', () => {
  it('preserves auth redirect behavior while attaching correlation headers', async () => {
    const request = new NextRequest('http://localhost/dashboard', {
      headers: new Headers({
        'x-request-id': 'req-redirect',
      }),
    });

    const response = await middleware(request);

    expect(response.headers.get('location')).toContain('/sign-in');
    expect(response.headers.get('x-request-id')).toBe('req-redirect');
    expect(response.headers.get('x-correlation-id')).toBe('req-redirect');
  });

  it('preserves the health contract and emits correlation headers', async () => {
    const response = await healthGET(
      new Request('http://localhost/api/health', {
        headers: new Headers({
          'x-request-id': 'req-health',
        }),
      }),
    );

    expect(await response.json()).toEqual({
      ok: true,
      service: 'ims-admin-portal',
    });
    expect(response.headers.get('x-request-id')).toBe('req-health');
    expect(response.headers.get('x-correlation-id')).toBe('req-health');
  });

  it('keeps the sign-out redirect while attaching observability headers', async () => {
    const response = await signOutGET(
      new Request('http://localhost/sign-out', {
        headers: new Headers({
          'x-request-id': 'req-signout',
        }),
      }),
    );

    expect(response.headers.get('location')).toContain('/sign-in');
    expect(response.headers.get('x-request-id')).toBe('req-signout');
    expect(response.headers.get('x-correlation-id')).toBe('req-signout');
  });
});
