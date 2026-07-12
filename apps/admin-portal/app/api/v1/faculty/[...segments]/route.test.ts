import { describe, expect, it } from 'vitest';
import { GET, POST } from './route';

function createParams() {
  return Promise.resolve({ segments: ['trainers'] });
}

describe('faculty trainers route', () => {
  it('returns JSON for unauthenticated trainer creation requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/v1/faculty/trainers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
      { params: createParams() },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
      status: 401,
      errorCode: 'IAM-AUTH-002',
    });
    expect(body.detail).toBeDefined();
  });

  it('returns JSON for unauthenticated trainer listing requests', async () => {
    const response = await GET(
      new Request('http://localhost/api/v1/faculty/trainers', {
        method: 'GET',
      }),
      { params: createParams() },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
      status: 401,
      errorCode: 'IAM-AUTH-002',
    });
    expect(body.detail).toBeDefined();
  });
});
