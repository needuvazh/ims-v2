import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { PermissionForm } from '../../_components/permission-form';
import { assertPermission } from '@/lib/auth-guard';

export const metadata = { title: 'Edit Permission - IAM | IMS Admin' };

export default async function IamEditPermissionPage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.permission.update');
  const params = await props.params;

  const { permissionService } = await import('@/lib/runtime');
  
  const permissionsData = await permissionService.searchPermissions();
  const permission = permissionsData.find((p: any) => p.id === params.id);

  if (!permission) {
    return <div>Permission not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit Permission"
        description={`Modify configuration for ${permission.permissionCode}.`}
        backUrl={`/iam/permissions/${params.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Permissions', href: '/iam/permissions' },
              { label: permission.permissionCode, href: `/iam/permissions/${params.id}` },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <div className="max-w-3xl">
        <PermissionForm mode="edit" initialData={permission} />
      </div>
    </div>
  );
}
