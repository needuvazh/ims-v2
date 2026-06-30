import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { ClassroomForm } from '@/app/(protected)/organization/classrooms/classroom-form';
import { notFound } from 'next/navigation';
import { Home, Building2, GraduationCap, Eye } from 'lucide-react';

export const metadata = { title: 'View Classroom | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ViewClassroomPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const data = await loadOrganizationData();
  const classroom = data.classrooms.find((c) => c.id === params.id);

  if (!classroom) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={classroom.classroomName}
        description="View classroom details."
        backUrl="/organization/classrooms"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Classrooms', href: '/organization/classrooms', icon: <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'View', icon: <Eye className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <ClassroomForm mode="view" initialData={classroom} branches={data.branches} />
    </div>
  );
}
