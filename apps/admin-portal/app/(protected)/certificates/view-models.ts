import { Prisma } from '@prisma/client';

export interface CertificateRegistryItemViewModel {
  id: string;
  certificateNumber: string;
  studentName: string;
  studentNumber: string;
  courseName: string;
  language: string;
  certificateStatus: string;
  issuedDate: string | null;
  version: number;
}

export interface CertificateReadinessItemViewModel {
  enrollmentId: string;
  enrollmentNumber: string;
  studentName: string;
  studentNumber: string;
  courseName: string;
  batchCode: string;
  branchName: string;
  paymentValidationRequired: boolean;
  paymentPassed: boolean;
}

export interface CertificateReissueRequestItemViewModel {
  id: string;
  certificateNumber: string;
  studentName: string;
  reason: string;
  status: string;
  requestedByUsername: string;
  version: number;
}

export interface CertificateMetricsViewModel {
  totalIssued: number;
  totalRevoked: number;
  totalGenerated: number;
  pendingReissues: number;
}

export const certificateRegistryListQuery =
  Prisma.validator<Prisma.CertificateDefaultArgs>()({
    select: {
      id: true,
      certificateNumber: true,
      language: true,
      certificateStatus: true,
      issuedDate: true,
      version: true,
      enrollment: {
        select: {
          studentProfile: {
            select: {
              studentNumber: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          course: {
            select: {
              nameEnglish: true,
            },
          },
        },
      },
    },
  });

export const certificateReadinessListQuery =
  Prisma.validator<Prisma.CourseCompletionDefaultArgs>()({
    select: {
      enrollment: {
        select: {
          id: true,
          enrollmentNumber: true,
          paymentValidationRequired: true,
          studentProfile: {
            select: {
              studentNumber: true,
              person: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          course: {
            select: {
              nameEnglish: true,
            },
          },
          batch: {
            select: {
              batchCode: true,
            },
          },
          branch: {
            select: {
              branchName: true,
            },
          },
          invoices: {
            select: {
              status: true,
              outstandingAmount: true,
            },
          },
        },
      },
    },
  });

export const certificateReissueListQuery =
  Prisma.validator<Prisma.CertificateReissueRequestDefaultArgs>()({
    select: {
      id: true,
      reason: true,
      status: true,
      version: true,
      certificate: {
        select: {
          certificateNumber: true,
          enrollment: {
            select: {
              studentProfile: {
                select: {
                  person: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      requestedByUser: {
        select: {
          username: true,
        },
      },
    },
  });

type CertificateRegistryRecord = Prisma.CertificateGetPayload<
  typeof certificateRegistryListQuery
>;
type CertificateReadinessRecord = Prisma.CourseCompletionGetPayload<
  typeof certificateReadinessListQuery
>;
type CertificateReissueRecord = Prisma.CertificateReissueRequestGetPayload<
  typeof certificateReissueListQuery
>;

export function mapCertificateRegistryItem(
  certificate: CertificateRegistryRecord,
): CertificateRegistryItemViewModel {
  return {
    id: certificate.id,
    certificateNumber: certificate.certificateNumber,
    studentName: formatPersonName(
      certificate.enrollment.studentProfile.person.firstName,
      certificate.enrollment.studentProfile.person.lastName,
    ),
    studentNumber: certificate.enrollment.studentProfile.studentNumber,
    courseName: certificate.enrollment.course.nameEnglish,
    language: certificate.language,
    certificateStatus: certificate.certificateStatus,
    issuedDate: toIsoString(certificate.issuedDate),
    version: certificate.version,
  };
}

export function mapCertificateReadinessItem(
  completion: CertificateReadinessRecord,
): CertificateReadinessItemViewModel {
  const { enrollment } = completion;
  const paymentPassed = enrollment.paymentValidationRequired
    ? enrollment.invoices.length > 0 &&
      enrollment.invoices.every(
        (invoice) =>
          invoice.status === 'Paid' || invoice.outstandingAmount.toNumber() <= 0,
      )
    : true;

  return {
    enrollmentId: enrollment.id,
    enrollmentNumber: enrollment.enrollmentNumber,
    studentName: formatPersonName(
      enrollment.studentProfile.person.firstName,
      enrollment.studentProfile.person.lastName,
    ),
    studentNumber: enrollment.studentProfile.studentNumber,
    courseName: enrollment.course.nameEnglish,
    batchCode: enrollment.batch?.batchCode ?? 'N/A',
    branchName: enrollment.branch.branchName,
    paymentValidationRequired: enrollment.paymentValidationRequired,
    paymentPassed,
  };
}

export function mapCertificateReissueRequestItem(
  request: CertificateReissueRecord,
): CertificateReissueRequestItemViewModel {
  return {
    id: request.id,
    certificateNumber: request.certificate.certificateNumber,
    studentName: formatPersonName(
      request.certificate.enrollment.studentProfile.person.firstName,
      request.certificate.enrollment.studentProfile.person.lastName,
    ),
    reason: request.reason,
    status: request.status,
    requestedByUsername: request.requestedByUser.username,
    version: request.version,
  };
}

function formatPersonName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
