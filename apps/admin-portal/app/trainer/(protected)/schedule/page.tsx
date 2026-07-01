import { prisma } from '@ims/database';
import { Card, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@ims/shared-ui';
import { getSession } from '../../../lib/auth-guard';
import { Layers } from 'lucide-react';

export default async function TrainerSchedulePage() {
  const session = await getSession();

  // Fetch batches assigned to this trainer (using trainerId = session.userId)
  const assignments = await prisma.batchTrainer.findMany({
    where: {
      trainerId: session.userId,
      isDeleted: false,
      status: 'Active',
    },
    include: {
      batch: {
        include: {
          course: {
            select: {
              nameEnglish: true,
            }
          }
        }
      }
    },
    orderBy: { assignedFrom: 'desc' },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Trainer Portal"
        title="My Batches & Timetable"
        description="View training batches you are AUTHORIZED to deliver, schedules, and active student counts."
      />
      
      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-semibold uppercase flex items-center gap-2">
          <Layers className="h-4 w-4 text-[color:var(--ims-primary)]" /> Assigned Batches ({assignments.length})
        </h3>
        
        {assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--ims-muted)]">
            You are not currently assigned to any active batches.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>My Role</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Enrolled Students</TableHead>
                <TableHead>Batch Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.batch.batchCode}</TableCell>
                  <TableCell>{a.batch.course.nameEnglish}</TableCell>
                  <TableCell>
                    <Badge variant={a.role === 'Primary' ? 'default' : 'outline'}>{a.role}</Badge>
                  </TableCell>
                  <TableCell>{new Date(a.assignedFrom).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(a.assignedTo).toLocaleDateString()}</TableCell>
                  <TableCell>{a.batch.currentEnrollmentCount} / {a.batch.capacity}</TableCell>
                  <TableCell>
                    <Badge variant={a.batch.status === 'OpenForEnrollment' ? 'success' : a.batch.status === 'InProgress' ? 'info' : 'outline'}>
                      {a.batch.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
