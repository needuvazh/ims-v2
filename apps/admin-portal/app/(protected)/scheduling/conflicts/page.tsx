import Link from 'next/link';
import { AlertTriangle, Home, LayoutDashboard, MapPinned } from 'lucide-react';
import {
  AdminListPageLayout,
  Breadcrumbs,
  DataTableFilter,
  Button,
  PageHeader,
  StatCard,
} from '@ims/shared-ui';
import { loadConflictDashboardData } from '../data';
import { ConflictDashboardClient } from '../_components/conflict-dashboard-client';

export const metadata = { title: 'Conflict Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

export default async function ConflictDashboardPage(props: {
  searchParams: Promise<{
    q?: string;
    branchId?: string;
    conflictType?: string;
    severity?: 'Conflict' | 'Warning' | 'Published';
  }>;
}) {
  const searchParams = await props.searchParams;
  const data = await loadConflictDashboardData(searchParams);

  const sessions = data.sessions.map((session) => {
    const classroomName = data.classrooms.find((classroom) => classroom.id === session.classroomId)?.classroomName ?? null;
    const branchName = data.branches.find((branch) => branch.id === session.batch.branchId)?.branchName ?? 'Unknown branch';

    return {
      id: session.id,
      batchId: session.batchId,
      batchCode: session.batch.batchCode,
      batchNameEnglish: session.batch.batchNameEnglish,
      courseName: session.batch.course.nameEnglish,
      titleEnglish: session.titleEnglish,
      titleArabic: session.titleArabic,
      sessionDate: session.sessionDate.toISOString(),
      startTime: session.startTime,
      endTime: session.endTime,
      branchId: session.batch.branchId,
      branchName,
      classroomId: session.classroomId,
      classroomName,
      scheduleStatus: session.scheduleStatus,
      conflictType: session.conflictType,
      overrideReason: session.overrideReason,
      isConflictIgnored: session.isConflictIgnored,
    };
  });

  return (
    <AdminListPageLayout>
      <PageHeader
        eyebrow="Scheduling"
        title="Conflict dashboard"
        description="Review sessions that need intervention or a branch manager override."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Scheduling', href: '/scheduling', icon: <MapPinned className="h-3.5 w-3.5 text-slate-400" /> },
              { label: 'Conflicts', icon: <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" /> },
            ]}
          />
        }
        actions={
          <Link href="/scheduling/venues">
            <Button variant="secondary" size="sm">
              Venue management
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Conflict"
          value={data.counts.conflict}
          description="Published sessions waiting on intervention"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Warnings"
          value={data.counts.warning}
          description="Published sessions with active overrides"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Holiday"
          value={data.counts.holiday}
          description="Holiday-driven schedule invalidations"
          icon={<MapPinned className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      <DataTableFilter
        searchPlaceholder="Search conflicts by batch, session title or reason..."
        filters={[
          ...(data.branches.length > 0
            ? [
                {
                  key: 'branchId',
                  label: 'Branch',
                  options: data.branches.map((branch) => ({ value: branch.id, label: branch.branchName })),
                },
              ]
            : []),
          {
            key: 'severity',
            label: 'Severity',
            options: [
              { value: 'Conflict', label: 'Conflict' },
              { value: 'Warning', label: 'Warning' },
              { value: 'Published', label: 'Published' },
            ],
          },
          {
            key: 'conflictType',
            label: 'Type',
            options: [
              { value: 'HOLIDAY', label: 'Holiday' },
              { value: 'VENUE', label: 'Venue' },
              { value: 'TRAINER_OVERLAP', label: 'Trainer overlap' },
              { value: 'CLASSROOM_OVERLAP', label: 'Classroom overlap' },
              { value: 'OPERATING_HOURS', label: 'Operating hours' },
            ],
          },
        ]}
      />

      <ConflictDashboardClient sessions={sessions} classrooms={data.classrooms} />
    </AdminListPageLayout>
  );
}
