import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { RoleForm } from '../role-form';

export const metadata = { title: 'Create Role - Identity | IMS Admin' };

export default function CreateRolePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Role"
        description="Add a new role to the system."
        backUrl="/identity/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Roles', href: '/identity/roles' },
              { label: 'Create' },
            ]}
          />
        }
      />
      <RoleForm mode="create" />
    </div>
  );
}
