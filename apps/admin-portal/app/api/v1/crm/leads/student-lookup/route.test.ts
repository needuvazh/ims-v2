import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const globalPersonLookupMock = vi.fn();

vi.mock('../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../lib/runtime', () => ({
  studentQueryService: {
    globalPersonLookup: (...args: any[]) => globalPersonLookupMock(...args),
  },
}));

vi.mock('../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Lead student lookup API route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    globalPersonLookupMock.mockReset();
  });

  it('GET /api/v1/crm/leads/student-lookup returns no match when no student profile exists', async () => {
    withPermissionMock.mockImplementation((_req, _perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );
    globalPersonLookupMock.mockResolvedValue({
      personFound: true,
      studentProfileId: null,
      personId: 'person-1',
      firstNameMasked: 'F****',
      lastNameMasked: 'A****',
      maskedEmail: 'fatima@example.com',
      maskedMobile: '+968 99***123',
      branchInfo: [],
      preflight: null,
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request(
        'http://localhost/api/v1/crm/leads/student-lookup?nationalId=123456789',
        {
          method: 'GET',
        },
      ),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.personFound).toBe(false);
    expect(body.data.studentProfileId).toBeNull();
  });

  it('GET /api/v1/crm/leads/student-lookup returns matched student details when profile exists', async () => {
    withPermissionMock.mockImplementation((_req, _perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );
    globalPersonLookupMock.mockResolvedValue({
      personFound: true,
      personId: 'person-1',
      studentProfileId: 'stu-1',
      studentNumber: 'STU-2026-00001',
      firstNameMasked: 'F****',
      lastNameMasked: 'A****',
      maskedEmail: 'fatima@example.com',
      maskedMobile: '+968 99***123',
      branchInfo: [
        {
          branchId: 'branch-1',
          branchName: 'Muscat Main',
          relation: 'Home',
        },
        {
          branchId: 'branch-2',
          branchName: 'Seeb Center',
          relation: 'Enrollment',
        },
      ],
      preflight: {
        hasActiveAdmission: false,
        activeAdmissionId: null,
        hasEnrollment: true,
        conflictCode: null,
      },
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request(
        'http://localhost/api/v1/crm/leads/student-lookup?nationalId=123456789',
        {
          method: 'GET',
        },
      ),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.personFound).toBe(true);
    expect(body.data.studentProfileId).toBe('stu-1');
    expect(body.data.branchInfo).toHaveLength(2);
    expect(globalPersonLookupMock).toHaveBeenCalledWith('123456789', null, {
      revealSensitive: true,
    });
  });
});
