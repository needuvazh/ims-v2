import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveAllowedBranchesMock = vi.fn();
const enrollmentFindUniqueMock = vi.fn();

vi.mock('../../../../../../../lib/runtime', () => ({
  branchScopeResolver: {
    resolveAllowedBranches: resolveAllowedBranchesMock,
  },
  prisma: {
    enrollment: {
      findUnique: enrollmentFindUniqueMock,
    },
  },
}));

const withPermissionMock = vi.fn();
const withRouteObservabilityMock = vi.fn((_headers, cb) => cb());
const applyObservabilityResponseHeadersMock = vi.fn();

vi.mock('../../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../../lib/observability', () => ({
  withRouteObservability: withRouteObservabilityMock,
  applyObservabilityResponseHeaders: applyObservabilityResponseHeadersMock,
  createStructuredLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
  getCurrentRequestContext: () => ({}),
}));

// Mock jsPDF
const addPageMock = vi.fn();
const addImageMock = vi.fn();
const textMock = vi.fn();
const lineMock = vi.fn();
const rectMock = vi.fn();
const setFillColorMock = vi.fn();
const setTextColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const outputMock = vi.fn(() => new ArrayBuffer(8));

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      addPage: addPageMock,
      addImage: addImageMock,
      text: textMock,
      line: lineMock,
      rect: rectMock,
      setFillColor: setFillColorMock,
      setTextColor: setTextColorMock,
      setDrawColor: setDrawColorMock,
      setFont: setFontMock,
      setFontSize: setFontSizeMock,
      output: outputMock,
    })),
  };
});

// Mock bwip-js
vi.mock('bwip-js', () => ({
  toBuffer: vi.fn((_opts, cb) => cb(null, Buffer.from('mock-barcode'))),
}));

// Mock qrcode
vi.mock('qrcode', () => ({
  toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-qrcode')),
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock-logo-data')),
}));

describe('enrollment ID card download route', () => {
  beforeEach(() => {
    resolveAllowedBranchesMock.mockReset();
    enrollmentFindUniqueMock.mockReset();
    withPermissionMock.mockReset();
    addPageMock.mockReset();
    addImageMock.mockReset();
    textMock.mockReset();
    lineMock.mockReset();
    rectMock.mockReset();
    setFillColorMock.mockReset();
    setTextColorMock.mockReset();
    setDrawColorMock.mockReset();
    setFontMock.mockReset();
    setFontSizeMock.mockReset();
    outputMock.mockReset().mockReturnValue(new ArrayBuffer(8));

    withPermissionMock.mockImplementation((_req, _perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          activeBranchId: 'branch-1',
        },
      }),
    );
  });

  it('generates PDF when enrollment is Confirmed and in scope', async () => {
    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    enrollmentFindUniqueMock.mockResolvedValue({
      id: 'enr-1',
      enrollmentNumber: 'ENR-00001',
      branchId: 'branch-1',
      enrollmentStatus: 'Confirmed',
      isDeleted: false,
      course: {
        nameEnglish: 'Test Course',
      },
      studentProfile: {
        person: {
          firstName: 'John',
          lastName: 'Doe',
          photoUrl: null,
        },
        branch: {
          branchName: 'Dubai Campus',
        },
      },
      batch: {
        batchCode: 'BATCH-001',
        endDate: new Date('2026-12-31'),
      },
      updatedAt: new Date(),
      createdAt: new Date(),
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/v1/enrollments/enr-1/id-card/download'),
      { params: Promise.resolve({ id: 'enr-1' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('course-card-ENR-00001.pdf');
  });

  it('rejects if enrollment is not Confirmed', async () => {
    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    enrollmentFindUniqueMock.mockResolvedValue({
      id: 'enr-1',
      enrollmentNumber: 'ENR-00001',
      branchId: 'branch-1',
      enrollmentStatus: 'Submitted',
      isDeleted: false,
      course: { nameEnglish: 'Test Course' },
      studentProfile: {
        person: { firstName: 'John', lastName: 'Doe', photoUrl: null },
      },
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/v1/enrollments/enr-1/id-card/download'),
      { params: Promise.resolve({ id: 'enr-1' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.errorCode).toBe('ERR_ENROLLMENT_NOT_CONFIRMED');
  });

  it('rejects if branch access is denied', async () => {
    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    enrollmentFindUniqueMock.mockResolvedValue({
      id: 'enr-1',
      enrollmentNumber: 'ENR-00001',
      branchId: 'branch-2',
      enrollmentStatus: 'Confirmed',
      isDeleted: false,
      course: { nameEnglish: 'Test Course' },
      studentProfile: {
        person: { firstName: 'John', lastName: 'Doe', photoUrl: null },
      },
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/v1/enrollments/enr-1/id-card/download'),
      { params: Promise.resolve({ id: 'enr-1' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('ERR_AUTH_BRANCH_DENIED');
  });

  it('returns 404 if enrollment does not exist', async () => {
    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    enrollmentFindUniqueMock.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/v1/enrollments/enr-1/id-card/download'),
      { params: Promise.resolve({ id: 'enr-1' }) },
    );

    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.errorCode).toBe('ERR_ENROLLMENT_NOT_FOUND');
  });
});
