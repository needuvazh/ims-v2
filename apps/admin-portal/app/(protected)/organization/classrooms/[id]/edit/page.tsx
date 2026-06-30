import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { ClassroomForm } from '@/app/(protected)/organization/classrooms/classroom-form';
import { notFound } from 'next/navigation';
import { Home, Building2, GraduationCap, Edit2 } from 'lucide-react';

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
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Classrooms', href: '/organization/classrooms', icon: <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Edit', icon: <Edit2 className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <ClassroomForm mode="edit" initialData={classroom} branches={data.branches} />
    </div>
  );
}
