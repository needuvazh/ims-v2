import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { PermissionForm } from '../_components/permission-form';
import { assertPermission } from '@/lib/auth-guard';
import { Home, ShieldCheck, Key, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Create Permission - IAM | IMS Admin' };

export default async function IamCreatePermissionPage() {
  redirect('/iam/permissions');
  await assertPermission('iam.permission.create');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Permission"
        backUrl="/iam/permissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Permissions', href: '/iam/permissions', icon: <Key className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Create Permission', icon: <Plus className="h-3.5 w-3.5 text-slate-500" /> },
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
