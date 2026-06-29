import { Breadcrumbs, PageHeader, Button } from '@ims/shared-ui';
import { RoleForm } from '../_components/role-form';
import { assertPermission } from '@/lib/auth-guard';
import { RoleUsersList } from '../_components/role-users-list';
import { RoleLifecycleDropdown } from './_components/role-lifecycle-dropdown';
import Link from 'next/link';

export const metadata = { title: 'View Role - IAM | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function IamViewRolePage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.role.read');
  const params = await props.params;
  
  const { roleService } = await import('@/lib/runtime');
  
  const rolesData = await roleService.listRoles();
  const role = rolesData.find((r: any) => r.id === params.id);

  if (!role) {
    return <div>Role not found</div>;
  }

  // Fetch users assigned to this role
  const users = await roleService.listUsersForRole(params.id, { actorId: '' });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Role Details"
        description={`Viewing details for ${role.roleName}.`}
        backUrl="/iam/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Roles', href: '/iam/roles' },
              { label: role.roleName },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-3">
            <RoleLifecycleDropdown roleId={params.id} currentStatus={role.status} isSystemRole={role.isSystemRole} />
            <Link href={`/iam/roles/${params.id}/permissions`}>
              <Button variant="secondary">Manage Permissions</Button>
            </Link>
            <Link href={`/iam/roles/${params.id}/edit`}>
              <Button>Edit Role</Button>
            </Link>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <RoleForm mode="view" initialData={role} />
        </div>
        <div className="lg:col-span-2">
          <RoleUsersList users={users} />
        </div>
      </div>
    </div>
  );
}
