'use server';

import { assertPermission } from '../../lib/auth-guard';
import { prisma } from '@ims/database';
import { Breadcrumbs, PageHeader, AdminListPageLayout } from '@ims/shared-ui';
import { CertificatesClientView } from './_components/certificates-client-view';

export default async function CertificatesPage(props: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('certificate.view');

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 10;
  const search = searchParams.q || '';
  const currentTab = searchParams.tab || 'registry';

  // 1. Fetch registry certificates
  const registryWhere: any = {};
  if (search) {
    registryWhere.OR = [
      { certificateNumber: { contains: search, mode: 'insensitive' } },
      {
        studentProfile: {
          studentNumber: { contains: search, mode: 'insensitive' },
        },
      },
      {
        studentProfile: {
          person: { firstName: { contains: search, mode: 'insensitive' } },
        },
      },
      {
        studentProfile: {
          person: { lastName: { contains: search, mode: 'insensitive' } },
        },
      },
    ];
  }

  // Branch isolation scoping
  const userBranches = await prisma.userBranchAccess.findMany({
    where: { userId: session.userId },
    select: { branchId: true },
  });
  const branchIds = userBranches.map((ub) => ub.branchId);

  if (branchIds.length > 0) {
    registryWhere.enrollment = {
      branchId: { in: branchIds },
    };
  }

  const certificates = await prisma.certificate.findMany({
    where: registryWhere,
    include: {
      enrollment: {
        include: {
          course: true,
          batch: true,
          branch: true,
          studentProfile: {
            include: {
              person: true,
            },
          },
        },
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });

  const registryTotal = await prisma.certificate.count({
    where: registryWhere,
  });

  // 2. Fetch completions for Readiness Queue (Approved, certificateAllowed = true, no active cert)
  const readinessWhere: any = {
    completionStatus: 'Approved',
    certificateAllowed: true,
    enrollment: {
      certificates: {
        none: {
          certificateStatus: { in: ['Generated', 'Issued'] },
        },
      },
    },
  };

  if (branchIds.length > 0) {
    readinessWhere.enrollment.branchId = { in: branchIds };
  }

  const completions = await prisma.courseCompletion.findMany({
    where: readinessWhere,
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
          invoices: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate finance validation status for each completion
  const readinessQueue = completions.map((comp) => {
    const enrollment = comp.enrollment;
    const invoices = enrollment.invoices;
    let paymentPassed = true;
    if (enrollment.paymentValidationRequired) {
      if (invoices.length === 0) {
        paymentPassed = false;
      } else {
        const unpaid = invoices.some(
          (inv) =>
            inv.outstandingAmount.toNumber() > 0 && inv.status !== 'Paid',
        );
        paymentPassed = !unpaid;
      }
    }

    return {
      enrollmentId: enrollment.id,
      enrollmentNumber: enrollment.enrollmentNumber,
      studentName: `${enrollment.studentProfile.person.firstName} ${enrollment.studentProfile.person.lastName}`,
      studentNumber: enrollment.studentProfile.studentNumber,
      courseName: enrollment.course.nameEnglish,
      batchCode: enrollment.batch?.batchCode || 'N/A',
      branchName: enrollment.branch.branchName,
      paymentValidationRequired: enrollment.paymentValidationRequired,
      paymentPassed,
    };
  });

  // 3. Fetch reissue requests
  const reissueWhere: any = {};
  if (branchIds.length > 0) {
    reissueWhere.certificate = {
      enrollment: {
        branchId: { in: branchIds },
      },
    };
  }

  const reissueRequests = await prisma.certificateReissueRequest.findMany({
    where: reissueWhere,
    include: {
      certificate: {
        include: {
          enrollment: {
            include: {
              course: true,
              studentProfile: {
                include: {
                  person: true,
                },
              },
            },
          },
        },
      },
      requestedByUser: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // 4. Fetch metrics
  const totalIssued = await prisma.certificate.count({
    where: { certificateStatus: 'Issued' },
  });
  const totalRevoked = await prisma.certificate.count({
    where: { certificateStatus: 'Revoked' },
  });
  const totalGenerated = await prisma.certificate.count({
    where: { certificateStatus: 'Generated' },
  });
  const pendingReissues = await prisma.certificateReissueRequest.count({
    where: { status: 'PendingReview' },
  });

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Certificates', href: '/certificates' },
  ];

  const serializedCertificates = certificates.map((cert) => ({
    ...cert,
    enrollment: {
      ...cert.enrollment,
      resolvedPrice: cert.enrollment.resolvedPrice.toNumber(),
      resolvedDiscount: cert.enrollment.resolvedDiscount.toNumber(),
      finalAmount: cert.enrollment.finalAmount.toNumber(),
    },
  }));

  const serializedReissueRequests = reissueRequests.map((req) => ({
    ...req,
    certificate: {
      ...req.certificate,
      enrollment: {
        ...req.certificate.enrollment,
        resolvedPrice: req.certificate.enrollment.resolvedPrice.toNumber(),
        resolvedDiscount: req.certificate.enrollment.resolvedDiscount.toNumber(),
        finalAmount: req.certificate.enrollment.finalAmount.toNumber(),
      },
    },
  }));

  return (
    <AdminListPageLayout>
      <div className="flex flex-col space-y-6 p-6">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title="Certificate Management"
          description="Generate, issue, verify, reissue, or revoke student credentials."
        />

        <CertificatesClientView
          certificates={serializedCertificates}
          readinessQueue={readinessQueue}
          reissueRequests={serializedReissueRequests}
          metrics={{
            totalIssued,
            totalRevoked,
            totalGenerated,
            pendingReissues,
          }}
          total={registryTotal}
          page={page}
          pageSize={pageSize}
          currentTab={currentTab}
        />
      </div>
    </AdminListPageLayout>
  );
}
