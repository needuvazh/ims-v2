import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  LinkButton,
  StatCard,
  PageHeader,
} from '@ims/shared-ui';
import { Calendar, Users, Layers, AlertCircle } from 'lucide-react';

export const metadata = { title: 'Batches - Admin Portal | ASTI IMS' };

export default async function BatchesPage(props: {
  searchParams: Promise<{
    courseId?: string;
    branchId?: string;
    status?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Assert view permission
  const session = await assertPermission('course.catalog.view');

  // Resolve filters based on branch access
  const isSuperAdmin = session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');
  let finalBranchId = searchParams.branchId || undefined;
  if (!isSuperAdmin && !searchParams.branchId) {
    finalBranchId = session.activeBranchId || undefined;
  }

  // Fetch batches
  const batches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      branchId: finalBranchId,
      courseId: searchParams.courseId,
      status: searchParams.status,
    },
    include: {
      course: {
        select: {
          nameEnglish: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  // Calculate KPIs
  const totalCount = await prisma.batch.count({ where: { isDeleted: false, branchId: finalBranchId } });
  const openCount = await prisma.batch.count({ where: { status: 'OpenForEnrollment', isDeleted: false, branchId: finalBranchId } });
  const inProgressCount = await prisma.batch.count({ where: { status: 'InProgress', isDeleted: false, branchId: finalBranchId } });
  const cancelledCount = await prisma.batch.count({ where: { status: 'Cancelled', isDeleted: false, branchId: finalBranchId } });

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

  const canCreate = session.permissions.includes('schedule.manage');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          eyebrow="Training Delivery"
          title="Batches"
          description="Manage course scheduling, classroom allocations, and trainer assignments."
        />
        {canCreate && (
          <LinkButton href="/batches/new" variant="primary">
            New Batch
          </LinkButton>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Batches"
          value={totalCount}
          icon={<Layers className="h-6 w-6 text-[color:var(--ims-primary)]" />}
        />
        <StatCard
          title="Open for Enrollment"
          value={openCount}
          icon={<Users className="h-6 w-6 text-green-500" />}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={<Calendar className="h-6 w-6 text-blue-500" />}
        />
        <StatCard
          title="Cancelled / Suspended"
          value={cancelledCount}
          icon={<AlertCircle className="h-6 w-6 text-red-500" />}
        />
      </div>

      {/* Batches Table */}
      <div className="bg-[color:var(--ims-card)] border border-[color:var(--ims-border)] rounded-lg overflow-hidden">
        {batches.length === 0 ? (
          <div className="p-12 text-center text-sm text-[color:var(--ims-muted)]">
            No training batches found matching search criteria.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Code</TableHead>
                <TableHead>Batch Name (EN)</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono font-medium">{b.batchCode}</TableCell>
                  <TableCell>{b.batchNameEnglish}</TableCell>
                  <TableCell>{b.course.nameEnglish}</TableCell>
                  <TableCell>{new Date(b.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(b.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>{b.capacity}</TableCell>
                  <TableCell>{b.currentEnrollmentCount}</TableCell>
                  <TableCell>{getStatusBadge(b.status)}</TableCell>
                  <TableCell className="text-right">
                    <LinkButton href={`/batches/${b.id}`} variant="outline" size="sm">
                      Manage
                    </LinkButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
