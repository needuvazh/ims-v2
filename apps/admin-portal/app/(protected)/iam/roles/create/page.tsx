import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { RoleForm } from '../_components/role-form';
import { assertPermission } from '@/lib/auth-guard';

export const metadata = { title: 'Create Role - IAM | IMS Admin' };

export default async function IamCreateRolePage() {
  await assertPermission('iam.role.create');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Role"
        description="Define a new organizational role."
        backUrl="/iam/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Roles', href: '/iam/roles' },
              { label: 'Create Role' },
            ]}
          />
        }
      />
      <div className="max-w-3xl">
        <RoleForm mode="create" />
      </div>
    </div>
  );
}
