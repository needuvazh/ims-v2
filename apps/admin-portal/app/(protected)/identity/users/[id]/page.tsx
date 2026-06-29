import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { UserForm } from '../user-form';
import { loadIdentityData } from '../../shared-data';

export const metadata = { title: 'View User - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewUserPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadIdentityData();
  const user = data.users.find(u => u.id === params.id);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="View User"
        description={`Viewing details for ${user.fullName}.`}
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM', href: '/iam' },
              { label: 'Users', href: '/iam/users' },
              { label: 'View User' },
            ]}
          />
        }
      />
      <UserForm mode="view" initialData={user} branches={data.branches} />
    </div>
  );
}
