import { AdminListPageLayout } from '@ims/shared-ui';
import { PermissionsClientList } from './_components/permissions-client-list';

export const metadata = { title: 'Permissions - IAM | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamPermissionsPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    module?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const { permissionService } = await import('@/lib/runtime');
  const permissions = await permissionService.searchPermissions();

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PermissionsClientList
        permissions={permissions.map((p: any) => ({
          id: p.id,
          permissionCode: p.permissionCode,
          description: p.description,
          moduleCode: p.moduleCode,
          featureCode: p.featureCode,
          actionCode: p.actionCode,
          permissionType: p.permissionType,
          status: p.status,
        }))}
        initialSearch={searchParams.q || ''}
        initialModule={searchParams.module || ''}
        initialType={searchParams.type || ''}
        initialStatus={searchParams.status || ''}
        initialSortBy={searchParams.sortBy || 'permissionCode'}
        initialSortOrder={searchParams.sortOrder === 'desc' ? 'desc' : 'asc'}
        initialPage={parseInt(searchParams.page || '1', 10) || 1}
        initialLimit={parseInt(searchParams.limit || '10', 10) || 10}
      />
    </AdminListPageLayout>
  );
}
