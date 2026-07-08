import { AdminListPageLayout } from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { DocumentMasterClient } from './_components/document-master-client';

export const metadata = { title: 'Document Master - Organization | ASTI IMS' };
export const dynamic = 'force-dynamic';

export default async function DocumentMasterPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    target?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  await assertPermission('document.requirement.manage');

  const searchParams = await props.searchParams;

  const branches = await prisma.branch.findMany({
    where: { status: 'Active' },
    select: { id: true, branchName: true },
    orderBy: { branchName: 'asc' },
  });

  const courses = await prisma.course.findMany({
    where: { status: 'Published' },
    select: { id: true, nameEnglish: true },
    orderBy: { nameEnglish: 'asc' },
  });

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <DocumentMasterClient
        branches={branches}
        courses={courses}
        initialSearch={searchParams.q || ''}
        initialTarget={searchParams.target || ''}
        initialStatus={searchParams.status || ''}
        initialSortBy={searchParams.sortBy || 'targetEntity'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
