import { AdminListPageLayout } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { ClassroomsClientList } from './_components/classrooms-client-list';

export const metadata = { title: 'Classrooms - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ClassroomsPage(props: {
  searchParams: Promise<{ page?: string; limit?: string; q?: string; status?: string; branchId?: string; sortBy?: string; sortOrder?: string }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();

  const branchOptions = data.branches.map((b) => ({ id: b.id, name: b.branchName }));

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <ClassroomsClientList
        classrooms={data.classrooms.map((c) => {
          const branch = data.branches.find((b) => b.id === c.branchId);
          return {
            id: c.id,
            classroomName: c.classroomName,
            branchId: c.branchId,
            branchName: branch ? branch.branchName : '—',
            capacity: c.capacity,
            location: c.location,
            effectiveStartDate: c.effectiveStartDate instanceof Date ? c.effectiveStartDate.toISOString() : String(c.effectiveStartDate ?? ''),
            effectiveEndDate: c.effectiveEndDate instanceof Date ? c.effectiveEndDate.toISOString() : String(c.effectiveEndDate ?? ''),
            status: c.status,
          };
        })}
        branches={branchOptions}
        hasBranches={data.branches.length > 0}
        initialSearch={searchParams.q || ''}
        initialStatus={searchParams.status || ''}
        initialBranchId={searchParams.branchId || ''}
        initialSortBy={searchParams.sortBy || 'classroomName'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
