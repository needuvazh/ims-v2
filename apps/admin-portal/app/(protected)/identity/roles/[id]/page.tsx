import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { RoleForm } from '../role-form';
import { loadIdentityData } from '../../shared-data';
import { Home, ShieldCheck, Shield as ShieldIcon, Eye } from 'lucide-react';

export const metadata = { title: 'View Role - Identity | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewRolePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadIdentityData();
  const role = data.roles.find((r: any) => r.id === params.id);

  if (!role) {
    return <div>Role not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="View Role"
        backUrl="/iam/roles"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Roles', href: '/iam/roles', icon: <ShieldIcon className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'View Role', icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <RoleForm mode="view" initialData={role} />
    </div>
  );
}
