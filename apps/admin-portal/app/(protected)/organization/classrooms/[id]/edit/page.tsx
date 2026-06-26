import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { ClassroomForm } from '@/app/(protected)/organization/classrooms/classroom-form';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Edit Classroom | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function EditClassroomPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const classroom = data.classrooms.find((c) => c.id === params.id);

  if (!classroom) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${classroom.classroomName}`}
        description="Modify existing classroom details."
        backUrl="/organization/classrooms"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Organization', href: '/organization' },
              { label: 'Classrooms', href: '/organization/classrooms' },
              { label: 'Edit' },
            ]}
          />
        }
      />
      <ClassroomForm mode="edit" initialData={classroom} branches={data.branches} />
    </div>
  );
}
