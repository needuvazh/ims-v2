import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const createPricingRuleMock = vi.fn();
const findManyPricingMock = vi.fn();

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../lib/runtime', () => ({
  coursePricingService: {
    createPricingRule: createPricingRuleMock,
  },
  prisma: {
    coursePricing: {
      findMany: findManyPricingMock,
    },
  },
}));

vi.mock('../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Course pricing API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    createPricingRuleMock.mockReset();
    findManyPricingMock.mockReset();
  });

  it('POST /api/v1/courses/[id]/pricing calls createPricingRule for global pricing with catalog permission', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) => {
      expect(perm).toBe('course.catalog.create'); // Checks global creator permission
      return cb({
        session: {
          userId: 'user-1',
          permissions: ['course.catalog.create'],
        },
      });
    });

    createPricingRuleMock.mockResolvedValue({ id: 'pricing-1', basePrice: 120 });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/courses/course-123/pricing', {
        method: 'POST',
        body: JSON.stringify({
          customerType: 'Individual',
          batchType: 'Regular',
          currency: 'OMR',
          basePrice: 120,
          effectiveStartDate: '2026-07-10',
        }),
      }),
      { params: Promise.resolve({ id: 'course-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createPricingRuleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'course-123',
        basePrice: 120,
      }),
      'user-1'
    );
  });

  it('POST /api/v1/courses/[id]/pricing gates overrides behind pricing override permission', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) => {
      expect(perm).toBe('course.pricing.override'); // Checks override permission
      return cb({
        session: {
          userId: 'user-1',
          permissions: ['course.pricing.override'],
        },
      });
    });

    createPricingRuleMock.mockResolvedValue({ id: 'pricing-2', basePrice: 140 });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/courses/course-123/pricing', {
        method: 'POST',
        body: JSON.stringify({
          branchId: '00000000-0000-0000-0000-000000000001',
          customerType: 'Individual',
          batchType: 'Regular',
          currency: 'OMR',
          basePrice: 140,
          effectiveStartDate: '2026-07-10',
        }),
      }),
      { params: Promise.resolve({ id: 'course-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
  });
});
