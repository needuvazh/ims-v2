import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { DepartmentForm } from '@/app/(protected)/organization/departments/department-form';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';

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
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Departments', href: '/organization/departments' },
              { label: 'Add Department' },
            ]}
          />
        }
      />
      <DepartmentForm mode="create" branches={data.branches} users={data.users} />
    </div>
  );
}
