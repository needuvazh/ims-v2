import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { ClassroomForm } from '@/app/(protected)/organization/classrooms/classroom-form';
import { loadOrganizationData } from '@/app/(protected)/organization/shared-data';
import { Home, Building2, GraduationCap, Plus } from 'lucide-react';

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
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Organization', href: '/organization', icon: <Building2 className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Classrooms', href: '/organization/classrooms', icon: <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Add Classroom', icon: <Plus className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
      />
      <ClassroomForm mode="create" branches={data.branches} />
    </div>
  );
}
