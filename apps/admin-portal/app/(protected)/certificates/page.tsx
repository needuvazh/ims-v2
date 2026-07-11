import { assertPermission } from '../../lib/auth-guard';
import { prisma } from '@ims/database';
import type { Prisma } from '@prisma/client';
import { Breadcrumbs, PageHeader, AdminListPageLayout } from '@ims/shared-ui';
import { CertificatesClientView } from './_components/certificates-client-view';
import {
  certificateReadinessListQuery,
  certificateRegistryListQuery,
  certificateReissueListQuery,
  mapCertificateReadinessItem,
  mapCertificateRegistryItem,
  mapCertificateReissueRequestItem,
} from './view-models';

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
  const registryWhere: Prisma.CertificateWhereInput = {};
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

  const rawCertificates = await prisma.certificate.findMany({
    where: registryWhere,
    ...certificateRegistryListQuery,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });
  const certificates = rawCertificates.map(mapCertificateRegistryItem);

  const registryTotal = await prisma.certificate.count({
    where: registryWhere,
  });

  // 2. Fetch completions for Readiness Queue (Approved, certificateAllowed = true, no active cert)
  const readinessEnrollmentWhere: Prisma.EnrollmentWhereInput = {
    certificates: {
      none: {
        certificateStatus: { in: ['Generated', 'Issued'] },
      },
    },
  };

  if (branchIds.length > 0) {
    readinessEnrollmentWhere.branchId = { in: branchIds };
  }

  const readinessWhere: Prisma.CourseCompletionWhereInput = {
    completionStatus: 'Approved',
    certificateAllowed: true,
    enrollment: {
      is: readinessEnrollmentWhere,
    },
  };

  const rawCompletions = await prisma.courseCompletion.findMany({
    where: readinessWhere,
    ...certificateReadinessListQuery,
    orderBy: { createdAt: 'desc' },
  });

  const readinessQueue = rawCompletions.map(mapCertificateReadinessItem);

  // 3. Fetch reissue requests
  const reissueWhere: Prisma.CertificateReissueRequestWhereInput = {};
  if (branchIds.length > 0) {
    reissueWhere.certificate = {
      enrollment: {
        branchId: { in: branchIds },
      },
    };
  }

  const rawReissueRequests = await prisma.certificateReissueRequest.findMany({
    where: reissueWhere,
    ...certificateReissueListQuery,
    orderBy: { createdAt: 'desc' },
  });
  const reissueRequests = rawReissueRequests.map(
    mapCertificateReissueRequestItem,
  );

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

  return (
    <AdminListPageLayout>
      <div className="flex flex-col space-y-6 p-6">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title="Certificate Management"
          description="Generate, issue, verify, reissue, or revoke student credentials."
        />

        <CertificatesClientView
          certificates={certificates}
          readinessQueue={readinessQueue}
          reissueRequests={reissueRequests}
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
