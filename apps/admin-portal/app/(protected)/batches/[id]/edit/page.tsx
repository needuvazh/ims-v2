import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
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

  // Fetch active branch context from the session
  const branches = [];
  if (session.activeBranchId) {
    const activeBranch = await prisma.branch.findUnique({
      where: { id: session.activeBranchId as string, isDeleted: false },
      select: { id: true, branchName: true },
    });
    if (activeBranch) {
      branches.push(activeBranch);
    }
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
    <AdminFormPageLayout>
      <PageHeader
        title={`Edit Batch: ${batch.batchCode}`}
        description="Modify batch properties, capacity limits, dates, and classroom assignments."
        backUrl={`/batches/${id}`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Batches',
                href: '/batches',
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              {
                label: batch.batchCode,
                href: `/batches/${id}`,
                icon: <Layers className="h-3.5 w-3.5" />,
              },
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
    </AdminFormPageLayout>
  );
}
