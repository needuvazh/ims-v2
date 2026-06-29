import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadIdentityData } from '../../../shared-data';
import { ManagePermissionsForm } from './manage-permissions-form';

export const metadata = { title: 'Manage Role Permissions - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ManageRolePermissionsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadIdentityData();
  const role = data.roles.find((r: any) => r.id === params.id);

  if (!role) {
    return <div>Role not found</div>;
  }

  const assignedPermissionIds = role.permissions.map((p: any) => p.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manage Role Permissions"
        description={`Assign or remove permissions for ${role.roleName}.`}
        backUrl="/identity/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Roles', href: '/identity/roles' },
              { label: 'Manage Permissions' },
            ]}
          />
        }
      />
      <ManagePermissionsForm 
        roleId={role.id} 
        allPermissions={data.permissions} 
        initialAssignedPermissionIds={assignedPermissionIds} 
      />
    </div>
  );
}
