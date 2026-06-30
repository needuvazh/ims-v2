import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { DepartmentForm } from '@/app/(protected)/organization/departments/department-form';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { Home, Building2, Layers, Plus } from 'lucide-react';

export const metadata = { title: 'Add Department | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CreateDepartmentPage() {
  const data = await loadOrganizationData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add New Department"
        description="Create a new department within a branch."
        backUrl="/organization/departments"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Departments', href: '/organization/departments', icon: <Layers className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Add Department', icon: <Plus className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <DepartmentForm mode="create" branches={data.branches} users={data.users} />
    </div>
  );
}
