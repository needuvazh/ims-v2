import { AdminListPageLayout } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { BranchesClientList } from './_components/branches-client-list';

export const metadata = { title: 'Branches - Organization | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function BranchesPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadOrganizationData();

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <BranchesClientList
        branches={data.branches.map((branch) => ({
          id: branch.id,
          branchCode: branch.branchCode,
          branchName: branch.branchName,
          branchManagerId: branch.branchManagerId,
          city: branch.city,
          country: branch.country,
          status: branch.status,
          effectiveStartDate: branch.effectiveStartDate
            ? new Date(branch.effectiveStartDate).toISOString()
            : null,
          effectiveEndDate: branch.effectiveEndDate
            ? new Date(branch.effectiveEndDate).toISOString()
            : null,
        }))}
        users={data.users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
        }))}
        institutes={data.institutes.map((institute) => ({
          id: institute.id,
          name: institute.instituteName,
        }))}
        initialSearch={searchParams.q || ''}
        initialStatus={searchParams.status || ''}
        initialSortBy={searchParams.sortBy || 'branchName'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
