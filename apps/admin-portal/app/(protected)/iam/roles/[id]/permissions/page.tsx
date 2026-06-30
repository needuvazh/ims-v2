import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { ManagePermissionsForm } from './manage-permissions-form';

export const metadata = { title: 'Manage Role Permissions - IAM | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamRolePermissionsPage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.role.permission.assign');
  const params = await props.params;

  const { roleService, permissionService } = await import('@/lib/runtime');

  const [rolesData, allPermissions, rolePermissions] = await Promise.all([
    roleService.listRoles(),
    permissionService.searchPermissions(),
    roleService.getRolePermissions(params.id, { actorId: '' }),
  ]);

  const role = rolesData.find((r: any) => r.id === params.id);
  
  if (!role) {
    return <div>Role not found</div>;
  }

  const assignedPermissionIds = rolePermissions.map((p: any) => p.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manage Role Permissions"
        description={`Assign or remove permissions for ${role.roleName}.`}
        backUrl={`/iam/roles/${params.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Roles', href: '/iam/roles' },
              { label: role.roleName, href: `/iam/roles/${params.id}` },
              { label: 'Permissions' },
            ]}
          />
        }
      />
      <div className="w-full">
        <ManagePermissionsForm
          roleId={params.id}
          allPermissions={allPermissions.map((p: any) => ({
            ...p,
            moduleCode: p.moduleCode ?? null,
            featureCode: p.featureCode ?? null,
            actionCode: p.actionCode ?? null,
          }))}
          initialAssignedPermissionIds={assignedPermissionIds}
        />
      </div>
    </div>
  );
}
