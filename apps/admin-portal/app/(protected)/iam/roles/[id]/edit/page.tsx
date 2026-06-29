import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { RoleForm } from '../../_components/role-form';
import { assertPermission } from '@/lib/auth-guard';

export const metadata = { title: 'Edit Role - IAM | IMS Admin' };

export default async function IamEditRolePage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.role.update');
  const params = await props.params;

  const { roleService } = await import('@/lib/runtime');
  
  const rolesData = await roleService.listRoles();
  const role = rolesData.find((r: any) => r.id === params.id);

  if (!role) {
    return <div>Role not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit Role"
        description={`Modify configuration for ${role.roleName}.`}
        backUrl={`/iam/roles/${params.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Roles', href: '/iam/roles' },
              { label: role.roleName, href: `/iam/roles/${params.id}` },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <div className="max-w-3xl">
        <RoleForm mode="edit" initialData={role} />
      </div>
    </div>
  );
}
