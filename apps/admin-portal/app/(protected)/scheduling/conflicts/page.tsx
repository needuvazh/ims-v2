import { AdminListPageLayout } from '@ims/shared-ui';
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
    const classroomName =
      data.classrooms.find((classroom) => classroom.id === session.classroomId)
        ?.classroomName ?? null;
    const branchName =
      data.branches.find((branch) => branch.id === session.batch.branchId)
        ?.branchName ?? 'Unknown branch';

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
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <ConflictDashboardClient
        sessions={sessions}
        classrooms={data.classrooms}
        branches={data.branches}
        counts={data.counts}
      />
    </AdminListPageLayout>
  );
}
