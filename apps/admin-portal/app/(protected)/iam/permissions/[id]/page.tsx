import { Breadcrumbs, PageHeader, Button } from '@ims/shared-ui';
import { PermissionForm } from '../_components/permission-form';
import { assertPermission } from '@/lib/auth-guard';
import { PermissionLifecycleDropdown } from './_components/permission-lifecycle-dropdown';
import Link from 'next/link';
import { Home, ShieldCheck, Key, Eye } from 'lucide-react';

export const metadata = { title: 'Permission Details - IAM | IMS Admin' };

export default async function IamViewPermissionPage(props: { params: Promise<{ id: string }> }) {
  await assertPermission('iam.permission.read');
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
        title={permission.permissionCode}
        backUrl="/iam/permissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'IAM', href: '/iam', icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Permissions', href: '/iam/permissions', icon: <Key className="h-3.5 w-3.5 text-slate-400" /> },
              { label: permission.permissionCode, icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-3">
            <PermissionLifecycleDropdown permissionId={params.id} currentStatus={permission.status} />
            <Link href={`/iam/permissions/${params.id}/edit`}>
              <Button>Edit Permission</Button>
            </Link>
          </div>
        }
      />

      <div className="max-w-3xl">
        <PermissionForm mode="view" initialData={permission} />
      </div>
    </div>
  );
}
