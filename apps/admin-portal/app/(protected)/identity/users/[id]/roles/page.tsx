import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadIdentityData } from '../../../shared-data';
import { getUserRolesAction } from '../../../actions';
import { ManageRolesForm } from './manage-roles-form';

export const metadata = { title: 'Manage User Roles - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ManageUserRolesPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadIdentityData();
  const user = data.users.find((u) => u.id === params.id);

  if (!user) {
    return <div>User not found</div>;
  }

  // Fetch roles currently assigned to the user
  const rolesRes = await getUserRolesAction(user.id);
  const assignedRoleIds = rolesRes.success && rolesRes.data ? rolesRes.data.map(r => r.id) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Manage User Roles"
        description={`Assign or remove roles for ${user.fullName}.`}
        backUrl="/identity/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Users', href: '/identity/users' },
              { label: 'Manage Roles' },
            ]}
          />
        }
      />
      <ManageRolesForm 
        userId={user.id} 
        allRoles={data.roles} 
        initialAssignedRoleIds={assignedRoleIds} 
      />
    </div>
  );
}
