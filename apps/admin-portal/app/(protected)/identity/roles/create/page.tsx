import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { RoleForm } from '../role-form';
import { Home, ShieldCheck, Shield as ShieldIcon, Plus } from 'lucide-react';

export const metadata = { title: 'Create Role - Identity | IMS Admin' };

export default function CreateRolePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Role"
        backUrl="/iam/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Roles', href: '/iam/roles', icon: <ShieldIcon className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Create', icon: <Plus className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <RoleForm mode="create" />
    </div>
  );
}
