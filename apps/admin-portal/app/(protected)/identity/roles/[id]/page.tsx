import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { RoleForm } from '../role-form';
import { loadIdentityData } from '../../shared-data';

export const metadata = { title: 'View Role - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewRolePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadIdentityData();
  const role = data.roles.find(r => r.id === params.id);

  if (!role) {
    return <div>Role not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="View Role"
        description={`Viewing details for ${role.roleName}.`}
        backUrl="/identity/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Roles', href: '/identity/roles' },
              { label: 'View Role' },
            ]}
          />
        }
      />
      <RoleForm mode="view" initialData={role} />
    </div>
  );
}
