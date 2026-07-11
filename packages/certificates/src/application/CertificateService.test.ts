import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificateService } from './CertificateService';
import { prisma } from '@ims/database';

vi.mock('@ims/database', () => ({
  prisma: {
    certificate: {
      findUnique: vi.fn(),
    },
  },
}));

describe('CertificateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a printable certificate view model from existing relations', async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      id: 'certificate-id',
      certificateNumber: 'ASTI/24/BH/14-0675',
      enrollment: {
        studentProfile: {
          person: {
            firstName: 'HAMEED',
            lastName: 'ALWAHAIBI',
          },
        },
        course: {
          nameEnglish: 'DEFENSIVE DRIVING TRAINING',
          courseClassification: 'Refresher',
        },
        batch: {
          startDate: new Date('2026-04-29T00:00:00.000Z'),
          endDate: new Date('2026-04-29T00:00:00.000Z'),
          batchType: 'Regular',
        },
        branch: {
          branchName: 'Al-Saud Muscat Branch',
        },
      },
    } as any);

    const service = new CertificateService();
    const viewModel = await service.getViewModel('certificate-id');

    expect(viewModel).toEqual({
      certificateNumber: 'ASTI/24/BH/14-0675',
      candidateName: 'HAMEED ALWAHAIBI',
      companyName: 'Al-Saud Muscat Branch',
      courseTitle: 'DEFENSIVE DRIVING TRAINING',
      courseType: 'Refresher',
      courseStartDate: '29/04/2026',
      courseEndDate: '29/04/2026',
    });
  });
});
