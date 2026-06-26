import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { ClassroomForm } from '@/app/(protected)/organization/classrooms/classroom-form';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';

export const metadata = { title: 'Add Classroom | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function CreateClassroomPage() {
  const data = await loadOrganizationData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add New Classroom"
        description="Create a new classroom within a branch."
        backUrl="/organization/classrooms"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Classrooms', href: '/organization/classrooms' },
              { label: 'Add Classroom' },
            ]}
          />
        }
      />
      <ClassroomForm mode="create" branches={data.branches} />
    </div>
  );
}
