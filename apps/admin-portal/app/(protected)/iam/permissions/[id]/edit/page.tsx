import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { PermissionForm } from '../../_components/permission-form';
import { assertPermission } from '@/lib/auth-guard';
import { Home, ShieldCheck, Key, Pencil } from 'lucide-react';

export const metadata = { title: 'Edit Permission - IAM | IMS Admin' };

export default async function IamEditPermissionPage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.permission.update');
  const params = await props.params;

  const { permissionService } = await import('@/lib/runtime');
  
  const permissionsData = await permissionService.searchPermissions();
  const permission = permissionsData.find((p: any) => p.id === params.id);

  if (!permission) {
    return <div>Permission not found</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit Permission"
        backUrl={`/iam/permissions/${params.id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Permissions', href: '/iam/permissions', icon: <Key className="h-3.5 w-3.5 text-slate-400" /> },
              { label: permission.permissionCode, href: `/iam/permissions/${params.id}`, icon: <Key className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <div className="max-w-3xl">
        <PermissionForm mode="edit" initialData={permission} />
      </div>
    </div>
  );
}
