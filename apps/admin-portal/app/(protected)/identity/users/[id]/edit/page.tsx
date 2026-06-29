import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { UserForm } from '../../user-form';
import { loadIdentityData } from '../../../shared-data';

export const metadata = { title: 'Edit User - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditUserPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Mock loading user data. In a real app, you would fetch by id.
  const data = await loadIdentityData();
  const user = data.users.find((u: any) => u.id === params.id);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit User"
        description={`Update details for ${user.fullName}.`}
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'IAM', href: '/iam' },
              { label: 'Users', href: '/iam/users' },
              { label: 'Edit User' },
            ]}
          />
        }
      />
      <UserForm key={user.id} mode="edit" initialData={user} branches={data.branches} />
    </div>
  );
}
