import Link from 'next/link';
import { Breadcrumbs, PageHeader, Button } from '@ims/shared-ui';
import { RoleForm } from '../role-form';
import { loadIdentityData } from '../../shared-data';
import { updateRoleStatusAction } from '../../actions';
import { Home, ShieldCheck, Shield as ShieldIcon, Eye, Pencil, Ban, CheckCircle } from 'lucide-react';

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
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/iam/roles/${role.id}/permissions`}>
              <Button variant="secondary" size="sm">
                <ShieldIcon className="h-4 w-4 mr-2 text-indigo-500" /> Manage Permissions
              </Button>
            </Link>

            <Link href={`/iam/roles/${role.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="h-4 w-4 mr-2 text-slate-500" /> Edit Role
              </Button>
            </Link>

            <form action={async () => {
              'use server';
              await updateRoleStatusAction(role.id, role.status === 'Active' ? 'Archived' : 'Active');
            }} noValidate>
              {role.status === 'Active' ? (
                <Button type="submit" variant="destructive" size="sm">
                  <Ban className="h-4 w-4 mr-2" /> Archive Role
                </Button>
              ) : (
                <Button type="submit" variant="secondary" size="sm" className="text-[color:var(--ims-success)] hover:bg-[color:var(--ims-success)]/10 border-[color:var(--ims-success)]/30">
                  <CheckCircle className="h-4 w-4 mr-2" /> Activate Role
                </Button>
              )}
            </form>
          </div>
        }
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
