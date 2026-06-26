import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { DepartmentForm } from '@/app/(protected)/organization/departments/department-form';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Edit Department | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditDepartmentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const department = data.departments.find((d) => d.id === params.id);

  if (!department) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${department.departmentName}`}
        description="Modify existing department details."
        backUrl="/organization/departments"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Departments', href: '/organization/departments' },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <DepartmentForm mode="edit" initialData={department} branches={data.branches} users={data.users} />
    </div>
  );
}
