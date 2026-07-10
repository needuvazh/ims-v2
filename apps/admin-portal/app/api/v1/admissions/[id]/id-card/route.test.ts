import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();

const prismaMock = {
  admission: {
    findUnique: vi.fn(),
  },
  studentProfile: {
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((cb) => cb(prismaMock)),
};

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../lib/runtime', () => ({
  prisma: prismaMock,
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
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

describe('Admissions ID Card API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    prismaMock.admission.findUnique.mockReset();
    prismaMock.studentProfile.update.mockReset();
    prismaMock.auditLog.create.mockReset();
  });

  describe('GET /api/v1/admissions/[id]/id-card/download', () => {
    it('returns a PDF file successfully if admission is approved', async () => {
      withPermissionMock.mockImplementation((req, perm, cb) =>
        cb({
          session: {
            userId: 'user-1',
            permissions: ['admission.read'],
            activeBranchId: 'branch-1',
          },
        }),
      );

      resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);

      prismaMock.admission.findUnique.mockResolvedValue({
        id: 'adm-123',
        branchId: 'branch-1',
        admissionStatus: 'Approved',
        isDeleted: false,
        studentProfile: {
          studentNumber: 'STU-2026-00001',
          idCardNumber: null,
          idCardIssued: false,
          branchId: 'branch-1',
        },
        person: {
          firstName: 'John',
          lastName: 'Doe',
        },
        course: {
          nameEnglish: 'Full Stack Development',
        },
        branch: {
          branchName: 'Dubai',
        },
      });

      const { GET } = await import('./download/route');
      const response = await GET(
        new Request(
          'http://localhost/api/v1/admissions/adm-123/id-card/download',
        ),
        { params: Promise.resolve({ id: 'adm-123' }) },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toContain(
        'id-card-STU-2026-00001.pdf',
      );
    });

    it('rejects if the admission is not approved', async () => {
      withPermissionMock.mockImplementation((req, perm, cb) =>
        cb({
          session: {
            userId: 'user-1',
            permissions: ['admission.read'],
            activeBranchId: 'branch-1',
          },
        }),
      );

      resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);

      prismaMock.admission.findUnique.mockResolvedValue({
        id: 'adm-123',
        branchId: 'branch-1',
        admissionStatus: 'Draft', // Not Approved!
        isDeleted: false,
        studentProfile: {
          studentNumber: 'STU-2026-00001',
          idCardNumber: null,
          idCardIssued: false,
          branchId: 'branch-1',
        },
      });

      const { GET } = await import('./download/route');
      const response = await GET(
        new Request(
          'http://localhost/api/v1/admissions/adm-123/id-card/download',
        ),
        { params: Promise.resolve({ id: 'adm-123' }) },
      );

      const body = await response.json();
      expect(response.status).toBe(422);
      expect(body.success).toBe(false);
      expect(body.errorCode).toBe('ERR_ADMISSION_NOT_APPROVED');
    });
  });

  describe('POST /api/v1/admissions/[id]/id-card/reissue', () => {
    it('reissues an ID Card successfully and increments suffixes', async () => {
      withPermissionMock.mockImplementation((req, perm, cb) =>
        cb({
          session: {
            userId: 'user-1',
            permissions: ['student.idcard.manage'],
            activeBranchId: 'branch-1',
          },
        }),
      );

      resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);

      prismaMock.admission.findUnique.mockResolvedValue({
        id: 'adm-123',
        branchId: 'branch-1',
        admissionStatus: 'Approved',
        isDeleted: false,
        studentProfile: {
          id: 'prof-123',
          studentNumber: 'STU-2026-00001',
          idCardNumber: 'STU-2026-00001-R1',
          idCardIssued: true,
          branchId: 'branch-1',
        },
      });

      const { POST } = await import('./reissue/route');
      const response = await POST(
        new Request(
          'http://localhost/api/v1/admissions/adm-123/id-card/reissue',
          {
            method: 'POST',
          },
        ),
        { params: Promise.resolve({ id: 'adm-123' }) },
      );

      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.idCardNumber).toBe('STU-2026-00001-R2');

      expect(prismaMock.studentProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof-123' },
        data: expect.objectContaining({
          idCardIssued: true,
          idCardNumber: 'STU-2026-00001-R2',
        }),
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          module: 'AdmissionsEnrollment',
          action: 'IDCardReissued',
          newValue: expect.objectContaining({
            idCardNumber: 'STU-2026-00001-R2',
          }),
        }),
      });
    });
  });
});
