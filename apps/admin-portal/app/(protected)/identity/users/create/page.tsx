import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { UserForm } from '../user-form';
import { loadIdentityData } from '../../shared-data';

export const metadata = { title: 'Create User - Identity | IMS Admin' };

export default async function CreateUserPage() {
  const data = await loadIdentityData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create User"
        description="Add a new user to the system."
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM', href: '/iam' },
              { label: 'Users', href: '/iam/users' },
              { label: 'Create' },
            ]}
          />
        }
      />
      <UserForm mode="create" branches={data.branches} />
    </div>
  );
}
