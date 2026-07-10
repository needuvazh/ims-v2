import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const withPermissionMock = vi.fn();
const withAuthMock = vi.fn();
const errorHandlerMock = vi.fn((err, fb) => {
  return NextResponse.json(
    { success: false, messageEnglish: fb.detail, errorCode: fb.errorCode },
    { status: 500 }
  );
});

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
  withAuth: withAuthMock,
  errorHandler: errorHandlerMock,
}));

const createPricingRuleMock = vi.fn();
const disablePricingRuleMock = vi.fn();
const verifyPermissionMock = vi.fn();
const findManyPricingMock = vi.fn();
const findFirstPricingMock = vi.fn();

vi.mock('../../../../../../lib/runtime', () => ({
  coursePricingService: {
    createPricingRule: createPricingRuleMock,
    disablePricingRule: disablePricingRuleMock,
  },
  authorizationGuard: {
    verifyPermission: verifyPermissionMock,
  },
}));

vi.mock('@ims/database', () => ({
  prisma: {
    coursePricing: {
      findFirst: findFirstPricingMock,
      findMany: findManyPricingMock,
    },
  },
}));

vi.mock('../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Course pricing API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    withAuthMock.mockReset();
    errorHandlerMock.mockReset();
    createPricingRuleMock.mockReset();
    disablePricingRuleMock.mockReset();
    verifyPermissionMock.mockReset();
    findManyPricingMock.mockReset();
    findFirstPricingMock.mockReset();
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

    createPricingRuleMock.mockResolvedValue({
      id: 'pricing-1',
      basePrice: 120,
    });

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
      { params: Promise.resolve({ id: 'course-123' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createPricingRuleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'course-123',
        basePrice: 120,
      }),
      'user-1',
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

    createPricingRuleMock.mockResolvedValue({
      id: 'pricing-2',
      basePrice: 140,
    });

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
      { params: Promise.resolve({ id: 'course-123' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it('PATCH /api/v1/courses/[id]/pricing disables global pricing using course.catalog.update', async () => {
    withAuthMock.mockResolvedValue({
      session: {
        userId: 'user-1',
        activeBranchId: 'branch-1',
      },
    });

    findFirstPricingMock.mockResolvedValue({
      id: 'pricing-global',
      branchId: null,
      batchId: null,
    });

    disablePricingRuleMock.mockResolvedValue({
      id: 'pricing-global',
      status: 'Inactive',
    });

    const { PATCH } = await import('./route');
    const response = await PATCH(
      new Request('http://localhost/api/v1/courses/course-123/pricing', {
        method: 'PATCH',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000002',
          action: 'disable',
        }),
      }),
      { params: Promise.resolve({ id: 'course-123' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyPermissionMock).toHaveBeenCalledWith(
      'user-1',
      'course.catalog.update',
      'branch-1'
    );
    expect(disablePricingRuleMock).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000002',
      'user-1'
    );
  });

  it('PATCH /api/v1/courses/[id]/pricing disables override pricing using course.pricing.override', async () => {
    withAuthMock.mockResolvedValue({
      session: {
        userId: 'user-1',
        activeBranchId: 'branch-1',
      },
    });

    findFirstPricingMock.mockResolvedValue({
      id: 'pricing-override',
      branchId: '00000000-0000-0000-0000-000000000009',
      batchId: null,
    });

    disablePricingRuleMock.mockResolvedValue({
      id: 'pricing-override',
      status: 'Inactive',
    });

    const { PATCH } = await import('./route');
    const response = await PATCH(
      new Request('http://localhost/api/v1/courses/course-123/pricing', {
        method: 'PATCH',
        body: JSON.stringify({
          id: '00000000-0000-0000-0000-000000000009',
          action: 'disable',
        }),
      }),
      { params: Promise.resolve({ id: 'course-123' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyPermissionMock).toHaveBeenCalledWith(
      'user-1',
      'course.pricing.override',
      'branch-1'
    );
    expect(disablePricingRuleMock).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000009',
      'user-1'
    );
  });
});
