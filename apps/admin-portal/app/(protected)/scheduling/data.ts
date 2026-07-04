import { prisma } from '@ims/database';
import { getAuthorizedBranchIds, isGlobalScope } from '@ims/shared-auth';
import { assertAnyPermission, assertPermission, getSession } from '@/lib/auth-guard';
import { organizationService, schedulingCalendarService } from '@/lib/runtime';

type BranchSummary = {
  id: string;
  branchName: string;
};

type ClassroomSummary = {
  id: string;
  classroomName: string;
  branchId: string;
};

function normalizeQuery(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

async function loadScopedOrganizationData() {
  const session = await getSession();
  const globalScope = isGlobalScope(session);
  const allowedBranchIds = globalScope ? [] : getAuthorizedBranchIds(session) ?? [];

  const [branches, classrooms] = await Promise.all([
    prisma.branch.findMany({
      where: globalScope ? { isDeleted: false } : { isDeleted: false, id: { in: allowedBranchIds } },
      select: { id: true, branchName: true },
      orderBy: { branchName: 'asc' },
    }),
    prisma.classroom.findMany({
      where: globalScope ? { isDeleted: false } : { isDeleted: false, branchId: { in: allowedBranchIds } },
      select: { id: true, classroomName: true, branchId: true },
      orderBy: { classroomName: 'asc' },
    }),
  ]);

  return {
    session,
    branches: branches as BranchSummary[],
    classrooms: classrooms as ClassroomSummary[],
    allowedBranchIds,
    globalScope,
  };
}

export async function loadSchedulingCalendars(filters: { q?: string; year?: number; status?: 'Draft' | 'Active' | 'Closed' | 'Archived' }) {
  await assertPermission('scheduling.calendar.read');
  return schedulingCalendarService.listCalendars(filters);
}

export async function loadSchedulingOverview() {
  await assertPermission('scheduling.calendar.read');
  const calendars = await schedulingCalendarService.listCalendars({});
  return {
    calendars,
    counts: {
      total: calendars.length,
      active: calendars.filter((calendar) => calendar.status === 'Active').length,
      draft: calendars.filter((calendar) => calendar.status === 'Draft').length,
      closed: calendars.filter((calendar) => calendar.status === 'Closed').length,
    },
  };
}

export async function loadCalendarDetail(calendarId: string, branchId?: string | null) {
  await assertPermission('scheduling.calendar.read');
  const session = await getSession();
  const calendar = await schedulingCalendarService.getCalendar(calendarId);
  const branchesResult = await organizationService.listBranches({ pageSize: 100, instituteId: calendar.instituteId });
  const branches = branchesResult.items.map((branch) => ({ id: branch.id, name: branch.branchName }));
  const selectedBranchId = branchId ?? session.activeBranchId ?? branches[0]?.id ?? null;
  const resolved = selectedBranchId
    ? await schedulingCalendarService.resolveCalendar(selectedBranchId, calendar.effectiveStartDate, calendar.instituteId)
    : null;

  return { calendar, branches, selectedBranchId, resolved };
}

export async function loadVenueManagementData(searchParams: {
  q?: string;
  branchId?: string;
  classroomId?: string;
  status?: 'Active' | 'Cancelled';
}) {
  await assertAnyPermission(['scheduling.venueBlock.read', 'scheduling.venueBlock.create', 'schedule.manage']);
  const { branches, classrooms, allowedBranchIds, globalScope } = await loadScopedOrganizationData();

  const selectedBranchId =
    searchParams.branchId && (globalScope || allowedBranchIds.includes(searchParams.branchId))
      ? searchParams.branchId
      : null;

  const selectedClassroomId =
    searchParams.classroomId && classrooms.some((classroom) => classroom.id === searchParams.classroomId)
      ? searchParams.classroomId
      : null;

  const venueBlocks = await prisma.venueBlock.findMany({
    where: {
      isDeleted: false,
      ...(globalScope || allowedBranchIds.length === 0 ? {} : { branchId: { in: allowedBranchIds } }),
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      ...(selectedClassroomId ? { classroomId: selectedClassroomId } : {}),
      ...(searchParams.status ? { status: searchParams.status } : {}),
    },
    include: {
      branch: {
        select: { id: true, branchName: true },
      },
      classroom: {
        select: { id: true, classroomName: true },
      },
    },
    orderBy: [{ blockDate: 'desc' }, { createdAt: 'desc' }],
  });

  const q = normalizeQuery(searchParams.q);
  const filteredBlocks = q
    ? venueBlocks.filter((block) => {
        const haystack = [
          block.branch.branchName,
          block.classroom?.classroomName ?? '',
          block.reasonCode,
          block.status,
          block.isFullDay ? 'full day' : 'partial day',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : venueBlocks;

  return {
    branches,
    classrooms,
    venueBlocks: filteredBlocks,
    selectedBranchId,
    selectedClassroomId,
  };
}

export async function loadConflictDashboardData(searchParams: {
  q?: string;
  branchId?: string;
  conflictType?: string;
  severity?: 'Conflict' | 'Warning' | 'Published';
}) {
  await assertAnyPermission(['scheduling.conflict.read', 'schedule.manage']);
  const { branches, classrooms, allowedBranchIds, globalScope, session } = await loadScopedOrganizationData();

  const selectedBranchId =
    searchParams.branchId && (globalScope || allowedBranchIds.includes(searchParams.branchId))
      ? searchParams.branchId
      : null;

  const sessions = await prisma.session.findMany({
    where: {
      isDeleted: false,
      ...(selectedBranchId
        ? { batch: { branchId: selectedBranchId } }
        : globalScope || allowedBranchIds.length === 0
          ? {}
          : { batch: { branchId: { in: allowedBranchIds } } }),
      ...(searchParams.severity === 'Conflict' ? { scheduleStatus: 'Conflict' } : {}),
      ...(searchParams.severity === 'Published' ? { scheduleStatus: 'Published' } : {}),
      ...(searchParams.severity === 'Warning'
        ? {
            OR: [{ isConflictIgnored: true }, { overrideReason: { not: null } }],
          }
        : {}),
      ...(searchParams.conflictType ? { conflictType: searchParams.conflictType as any } : {}),
    },
    include: {
      batch: {
        select: {
          id: true,
          batchCode: true,
          batchNameEnglish: true,
          branchId: true,
          course: {
            select: {
              id: true,
              nameEnglish: true,
            },
          },
        },
      },
    },
    orderBy: [
      { sessionDate: 'asc' },
      { startTime: 'asc' },
    ],
  });

  const q = normalizeQuery(searchParams.q);
  const filteredSessions = q
    ? sessions.filter((sessionRecord) => {
        const haystack = [
          sessionRecord.batch.batchCode,
          sessionRecord.batch.batchNameEnglish,
          sessionRecord.batch.course.nameEnglish,
          sessionRecord.titleEnglish,
          sessionRecord.titleArabic,
          sessionRecord.conflictType ?? '',
          sessionRecord.scheduleStatus,
          sessionRecord.overrideReason ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : sessions;

  const counts = {
    conflict: filteredSessions.filter((entry) => entry.scheduleStatus === 'Conflict').length,
    warning: filteredSessions.filter((entry) => entry.isConflictIgnored || (entry.scheduleStatus === 'Published' && entry.overrideReason)).length,
    holiday: filteredSessions.filter((entry) => entry.conflictType === 'HOLIDAY').length,
    venue: filteredSessions.filter((entry) => entry.conflictType === 'VENUE').length,
    overlap: filteredSessions.filter((entry) => entry.conflictType === 'TRAINER_OVERLAP' || entry.conflictType === 'CLASSROOM_OVERLAP').length,
  };

  return {
    session,
    branches,
    classrooms,
    sessions: filteredSessions,
    selectedBranchId,
    counts,
  };
}
