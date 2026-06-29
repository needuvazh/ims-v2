import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { UserForm } from '../user-form';
import { loadIdentityData } from '../../shared-data';
import { Home, ShieldCheck, Users, Eye } from 'lucide-react';

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
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Users', href: '/iam/users', icon: <Users className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'View User', icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <UserForm mode="view" initialData={user} branches={data.branches} />
    </div>
  );
}
