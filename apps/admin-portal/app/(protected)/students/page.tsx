import { assertPermission } from '@/lib/auth-guard';
import { AdminListPageLayout, Button, StatCard } from '@ims/shared-ui';
import { Archive, CheckCircle2, Clock3, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { StudentsClientList } from './_components/students-client-list';

export const metadata = {
  title: 'Student Directory - Admin Portal | ASTI IMS',
};

export default async function StudentLookupPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
    admissionStatus?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('student.read');

  const query = searchParams.q || '';
  const statusFilter = searchParams.status || '';
  const branchFilter = searchParams.branchId || '';
  const admissionFilter = searchParams.admissionStatus || '';
  const currentPage = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const currentSortBy = searchParams.sortBy || 'joinedAt';
  const currentSortOrder =
    (searchParams.sortOrder as 'asc' | 'desc' | undefined) || 'desc';
  const canCreateStudent =
    session.permissions.includes('student.create') ||
    session.permissions.includes('student.write');
  const canReadAdmissions = session.permissions.includes(
    'student.related.admission.read',
  );

  const { branchScopeResolver, studentQueryService, prisma } =
    await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  const branches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds }, isDeleted: false },
    select: { id: true, branchName: true, branchCode: true },
  });

  const result = await studentQueryService.searchBranchScopedStudents(
    query,
    allowedBranchIds as string[],
    {
      page: currentPage,
      limit: 25,
      studentStatus: statusFilter || undefined,
      branchId: branchFilter || undefined,
      admissionStatus: admissionFilter || undefined,
      sortBy: currentSortBy as any,
      sortOrder: currentSortOrder,
    },
  );

  const visibleStudents = result.items;
  const activeCount = visibleStudents.filter(
    (student: any) => student.status === 'Active',
  ).length;
  const suspendedCount = visibleStudents.filter(
    (student: any) => student.status === 'Suspended',
  ).length;
  const archivedCount = visibleStudents.filter(
    (student: any) => student.status === 'Archived',
  ).length;

  return (
    <AdminListPageLayout>
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <Users className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Student Directory
          </h1>
        </div>
        {canCreateStudent && (
          <Link href="/students/new" className="shrink-0">
            <Button className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Create Student</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Students"
          value={result.total}
          description="Branch-scoped records in view"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={activeCount}
          description="Operational student profiles"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Suspended"
          value={suspendedCount}
          description="Temporarily inactive profiles"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Archived"
          value={archivedCount}
          description="Soft-deleted records"
          icon={<Archive className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <StudentsClientList
        students={result.items}
        branches={branches.map((b) => ({
          id: b.id,
          name: b.branchName,
          code: b.branchCode,
        }))}
        total={result.total}
        currentPage={currentPage}
        canReadAdmissions={canReadAdmissions}
        defaultSearch={query}
        defaultStatus={statusFilter}
        defaultBranchId={branchFilter}
        defaultAdmissionStatus={admissionFilter}
        defaultSortBy={currentSortBy}
        defaultSortOrder={currentSortOrder}
      />
    </AdminListPageLayout>
  );
}
