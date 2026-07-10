import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const createInvoiceMock = vi.fn();

vi.mock('../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../lib/runtime', () => ({
  financeService: { createInvoice: createInvoiceMock },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
}));

vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Finance Invoices API route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    createInvoiceMock.mockReset();
  });

  it('POST /api/v1/finance/invoices successfully creates an invoice', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-123',
          permissions: ['finance.invoice.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue([
      '11111111-1111-1111-1111-111111111111',
    ]);
    createInvoiceMock.mockResolvedValue({
      id: 'inv-123',
      invoiceNumber: 'INV-2026-000001',
      totalAmount: 105,
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/finance/invoices', {
        method: 'POST',
        body: JSON.stringify({
          invoiceType: 'StudentInvoice',
          category: 'Student',
          subCategory: 'FullPayment',
          studentProfileId: '22222222-2222-2222-2222-222222222222',
          branchId: '11111111-1111-1111-1111-111111111111',
          invoiceDate: '2026-07-04',
          dueDate: '2026-08-01',
          currency: 'OMR',
          lineItems: [
            {
              sourceBranchId: '11111111-1111-1111-1111-111111111111',
              descriptionEnglish: 'Course Registration',
              quantity: 1,
              unitPrice: 100,
              discountAmount: 0,
              taxRate: 0.05,
            },
          ],
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.invoiceId).toBe('inv-123');
    expect(body.invoiceNumber).toBe('INV-2026-000001');
    expect(createInvoiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceType: 'StudentInvoice',
        branchId: '11111111-1111-1111-1111-111111111111',
        currency: 'OMR',
      }),
    );
  });
});
