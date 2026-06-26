import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { UserForm } from '../user-form';

export const metadata = { title: 'Create User - Identity | IMS Admin' };

export default function CreateUserPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Create User"
        description="Add a new user to the system."
        backUrl="/identity/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Identity', href: '/identity' },
              { label: 'Users', href: '/identity/users' },
              { label: 'Create' },
            ]}
          />
        }
      />
      <UserForm mode="create" />
    </div>
  );
}
