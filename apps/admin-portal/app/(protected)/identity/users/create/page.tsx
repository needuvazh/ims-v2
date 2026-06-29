import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { UserForm } from '../user-form';
import { loadIdentityData } from '../../shared-data';
import { Home, ShieldCheck, Users, UserPlus } from 'lucide-react';

export const metadata = { title: 'Create User - Identity | IMS Admin' };

export default async function CreateUserPage() {
  const data = await loadIdentityData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create User"
        backUrl="/iam/users"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Users', href: '/iam/users', icon: <Users className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Create', icon: <UserPlus className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <UserForm mode="create" branches={data.branches} />
    </div>
  );
}
