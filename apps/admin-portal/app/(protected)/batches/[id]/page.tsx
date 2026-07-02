import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import {
  Breadcrumbs,
  PageHeader,
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from '@ims/shared-ui';
import { Home, Layers, Calendar, Users, ShieldAlert, Edit } from 'lucide-react';
import Link from 'next/link';
import { assignTrainerAction, transitionBatchStatusAction, addToWaitlistAction, manualPromoteAction } from '../actions';
import { TransitionButtons } from '../_components/transition-buttons';
import { BatchDetailsTabs } from '../_components/batch-details-tabs';

export const metadata = { title: 'Batch Details - Admin Portal | ASTI IMS' };

export default async function BatchDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // Assert view permission
  const session = await assertPermission('course.catalog.view');

  const batch = await prisma.batch.findUnique({
    where: { id, isDeleted: false },
    include: {
      course: true,
    },
  });

  if (!batch) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Batch not found or has been deleted.
      </div>
    );
  }

  // Fetch Mapped Trainers
  const trainers = await prisma.batchTrainer.findMany({
    where: { batchId: id, isDeleted: false },
    orderBy: { assignedFrom: 'asc' },
  });

  // Fetch Scheduled Sessions
  const sessions = await prisma.session.findMany({
    where: { batchId: id, isDeleted: false },
    orderBy: { sessionNumber: 'asc' },
  });

  // Fetch Waitlist entries
  const waitlist = await prisma.waitingList.findMany({
    where: {
      batchId: id,
      status: { in: ['Waiting', 'Held', 'Suspended'] },
      isDeleted: false,
    },
    orderBy: { queuePosition: 'asc' },
  });

  // Fetch active trainers with person details
  const trainersListRaw = await prisma.user.findMany({
    where: {
      isDeleted: false,
      status: 'Active',
      roles: {
        some: {
          role: {
            roleCode: 'TRAINER',
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const trainersList = trainersListRaw.map((t) => ({
    id: t.id,
    email: t.email,
    displayName: `${t.person.firstName} ${t.person.lastName}`,
  }));

  // Fetch active students
  const studentsListRaw = await prisma.studentProfile.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
        },
      },
    },
  });

  const studentsList = studentsListRaw.map((student) => ({
    id: student.id,
    firstName: student.person.firstName,
    lastName: student.person.lastName,
    email: student.person.email ?? student.person.mobile,
  }));

  // Fetch active CRM leads
  const leadsList = await prisma.lead.findMany({
    where: {
      isDeleted: false,
      stage: { notIn: ['Converted', 'Won', 'Lost'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      leadNumber: true,
    },
  });

  // Fetch active classrooms
  const classroomsList = await prisma.classroom.findMany({
    where: { isDeleted: false, status: 'Active' },
    select: {
      id: true,
      classroomName: true,
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'OpenForEnrollment':
        return <Badge variant="success">Open</Badge>;
      case 'InProgress':
        return <Badge variant="info">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="default">Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isCoordinator = session.permissions.includes('schedule.manage');
  const isRegistrar = session.permissions.includes('enrollment.create');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Batch: ${batch.batchCode}`}
        description={`${batch.batchNameEnglish} (Arabic: ${batch.batchNameArabic})`}
        backUrl="/batches"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Batches', href: '/batches', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: batch.batchCode, icon: <Layers className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          isCoordinator && (
            <Link href={`/batches/${batch.id}/edit`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit className="h-4 w-4" /> Edit Batch
              </Button>
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hand Details & Transitions */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold border-b border-[color:var(--ims-border)] pb-2 uppercase">Batch Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">Course:</span>
                <span className="font-medium">{batch.course.nameEnglish}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">Status:</span>
                <span>{getStatusBadge(batch.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">Capacity:</span>
                <span className="font-medium">{batch.capacity} seats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">Enrolled Count:</span>
                <span className="font-medium">{batch.currentEnrollmentCount} enrolled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">Start Date:</span>
                <span className="font-medium">{new Date(batch.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">End Date:</span>
                <span className="font-medium">{new Date(batch.endDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--ims-muted)]">Walk-in Batch:</span>
                <span className="font-medium">{batch.isWalkIn ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {/* State transitions buttons */}
            {isCoordinator && (
              <div className="pt-4 border-t border-[color:var(--ims-border)] space-y-2">
                <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase mb-1">State Actions</span>
                <TransitionButtons batchId={batch.id} status={batch.status} version={batch.version} />
              </div>
            )}
          </Card>
        </div>

        {/* Right Hand Panels */}
        <div className="lg:col-span-2">
          <BatchDetailsTabs
            batchId={batch.id}
            batchStartDate={batch.startDate.toISOString()}
            batchEndDate={batch.endDate.toISOString()}
            sessions={sessions}
            trainers={trainers}
            waitlist={waitlist}
            trainersList={trainersList}
            studentsList={studentsList}
            leadsList={leadsList}
            classroomsList={classroomsList}
            isRegistrar={isRegistrar}
            isCoordinator={isCoordinator}
          />
        </div>
      </div>
    </div>
  );
}
