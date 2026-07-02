import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader } from '@ims/shared-ui';
import { Home, Layers, Edit } from 'lucide-react';
import { prisma } from '@ims/database';
import { BatchForm } from '../../_components/batch-form';
import { updateBatchAction } from '../../actions';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Edit Batch - Admin Portal | ASTI IMS' };

export default async function EditBatchPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await assertPermission('schedule.manage');

  // Fetch the batch to edit
  const batch = await prisma.batch.findUnique({
    where: { id, isDeleted: false },
  });

  if (!batch) {
    notFound();
  }

  // Fetch Published courses for selection
  const courses = await prisma.course.findMany({
    where: { status: 'Published', isDeleted: false },
    select: { id: true, courseCode: true, nameEnglish: true },
  });

  // Fetch Branches the user has access to
  const isSuperAdmin = session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');
  let branches;
  if (isSuperAdmin) {
    branches = await prisma.branch.findMany({
      where: { isDeleted: false },
      select: { id: true, branchName: true },
    });
  } else {
    // Resolve based on user branch access mappings
    const access = await prisma.userBranchAccess.findMany({
      where: { userId: session.userId, status: 'Active' },
      include: { branch: true },
    });
    branches = access.map((a) => ({
      id: a.branch.id,
      branchName: a.branch.branchName,
    }));
  }

  // Fetch active classrooms
  const classrooms = await prisma.classroom.findMany({
    where: { isDeleted: false, status: 'Active' },
    select: { id: true, classroomName: true, capacity: true },
  });

  const onSubmitAction = async (data: any) => {
    'use server';
    return updateBatchAction(id, batch.version, data);
  };

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title={`Edit Batch: ${batch.batchCode}`}
        description="Modify batch properties, capacity limits, dates, and classroom assignments."
        backUrl={`/batches/${id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Batches', href: '/batches', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: batch.batchCode, href: `/batches/${id}`, icon: <Layers className="h-3.5 w-3.5" /> },
              { label: 'Edit', icon: <Edit className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div>
        <BatchForm
          courses={courses}
          branches={branches}
          classrooms={classrooms}
          initialData={batch}
          onSubmitAction={onSubmitAction}
        />
      </div>
    </div>
  );
}
