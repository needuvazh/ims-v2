import { AdminListPageLayout } from '@ims/shared-ui';
import { loadIdentityData } from '../shared-data';
import { RolesClientList } from './_components/roles-client-list';

export const metadata = { title: 'IAM Roles | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IdentityRolesPage(props: {
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
  const data = await loadIdentityData();

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <RolesClientList
        roles={data.roles.map((role: any) => ({
          id: role.id,
          roleCode: role.roleCode,
          roleName: role.roleName,
          description: role.description,
          status: role.status,
          effectiveStartDate:
            role.effectiveStartDate instanceof Date
              ? role.effectiveStartDate.toISOString()
              : String(role.effectiveStartDate),
          effectiveEndDate: role.effectiveEndDate
            ? role.effectiveEndDate instanceof Date
              ? role.effectiveEndDate.toISOString()
              : String(role.effectiveEndDate)
            : null,
          permissionsCount: Array.isArray(role.permissions)
            ? role.permissions.length
            : 0,
        }))}
        initialSearch={searchParams.q || ''}
        initialStatus={searchParams.status || ''}
        initialSortBy={searchParams.sortBy || 'roleName'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
