import { prisma } from '@ims/database';

export interface CertificateViewModel {
  certificateNumber: string;
  candidateName: string;
  companyName: string;
  courseTitle: string;
  courseType: string;
  courseStartDate: string;
  courseEndDate: string;
}

export class CertificateService {
  async getViewModel(certificateId: string): Promise<CertificateViewModel> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        enrollment: {
          include: {
            studentProfile: {
              include: {
                person: true,
              },
            },
            course: true,
            batch: true,
            branch: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    const person = certificate.enrollment.studentProfile.person;
    const course = certificate.enrollment.course;
    const batch = certificate.enrollment.batch;
    const branch = certificate.enrollment.branch;

    return {
      certificateNumber: certificate.certificateNumber,
      candidateName: `${person.firstName} ${person.lastName}`.trim().toUpperCase(),
      companyName: branch?.branchName || 'ASTI',
      courseTitle: course?.nameEnglish || 'N/A',
      courseType: course?.courseClassification || 'N/A',
      courseStartDate: this.formatDate(batch?.startDate),
      courseEndDate: this.formatDate(batch?.endDate),
    };
  }

  private formatDate(value: Date | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
