import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { DepartmentForm } from '@/app/(protected)/organization/departments/department-form';
import { notFound } from 'next/navigation';
import { Home, Building2, Layers, Eye } from 'lucide-react';

export const metadata = { title: 'View Department | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewDepartmentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const department = data.departments.find((d) => d.id === params.id);

  if (!department) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={department.departmentName}
        description="View department details."
        backUrl="/organization/departments"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Departments', href: '/organization/departments', icon: <Layers className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'View', icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <DepartmentForm mode="view" initialData={department} branches={data.branches} users={data.users} />
    </div>
  );
}
