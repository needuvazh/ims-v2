import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { PermissionForm } from '../_components/permission-form';
import { assertPermission } from '@/lib/auth-guard';

export const metadata = { title: 'Create Permission - IAM | IMS Admin' };

export default async function IamCreatePermissionPage() {
  await assertPermission('iam.permission.create');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Permission"
        description="Define a new system permission."
        backUrl="/iam/permissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM Console', href: '/iam' },
              { label: 'Permissions', href: '/iam/permissions' },
              { label: 'Create Permission' },
            ]}
          />
        }
      />
      <div className="max-w-3xl">
        <PermissionForm mode="create" />
      </div>
    </div>
  );
}
