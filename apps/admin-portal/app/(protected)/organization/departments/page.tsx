import { AdminListPageLayout } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { DepartmentsClientList } from './_components/departments-client-list';

export const metadata = { title: 'Departments - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function DepartmentsPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    status?: string;
    branchId?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <DepartmentsClientList
        departments={data.departments.map((dept) => ({
          id: dept.id,
          departmentCode: dept.departmentCode,
          departmentName: dept.departmentName,
          branchId: dept.branchId,
          departmentHeadId: dept.departmentHeadId,
          status: dept.status,
          effectiveStartDate: dept.effectiveStartDate ? new Date(dept.effectiveStartDate).toISOString() : null,
          effectiveEndDate: dept.effectiveEndDate ? new Date(dept.effectiveEndDate).toISOString() : null,
        }))}
        branches={data.branches.map((branch) => ({ id: branch.id, name: branch.branchName }))}
        users={data.users.map((user) => ({ id: user.id, fullName: user.fullName }))}
        initialSearch={searchParams.q || ''}
        initialStatus={searchParams.status || ''}
        initialBranchId={searchParams.branchId || ''}
        initialSortBy={searchParams.sortBy || 'departmentName'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
