import { prisma } from '@ims/database';
import {
  getAuthorizedBranchIds,
  isGlobalScope,
  hasPermission,
} from '@ims/shared-auth';
import {
  assertAnyPermission,
  assertPermission,
  getSession,
} from '@/lib/auth-guard';
import { organizationService, schedulingCalendarService } from '@/lib/runtime';

type BranchSummary = {
  id: string;
  branchName: string;
};

type InstituteSummary = {
  id: string;
  instituteCode: string;
  instituteName: string;
};

type ClassroomSummary = {
  id: string;
  classroomName: string;
  branchId: string;
};

type VenueBlockSummary = {
  id: string;
  blockStartDate: Date;
  blockEndDate: Date;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  reasonCode: string;
  status: string;
  branch: {
    id: string;
    branchName: string;
  };
  classroom: {
    id: string;
    classroomName: string;
  } | null;
};

function normalizeQuery(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

async function loadScopedOrganizationData() {
  const session = await getSession();
  const globalScope = isGlobalScope(session);
  const allowedBranchIds = globalScope
    ? []
    : (getAuthorizedBranchIds(session) ?? []);

  const [branches, classrooms] = await Promise.all([
    prisma.branch.findMany({
      where: globalScope
        ? { isDeleted: false }
        : { isDeleted: false, id: { in: allowedBranchIds } },
      select: { id: true, branchName: true },
      orderBy: { branchName: 'asc' },
    }),
    prisma.classroom.findMany({
      where: globalScope
        ? { isDeleted: false }
        : { isDeleted: false, branchId: { in: allowedBranchIds } },
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

export async function loadInstituteOptions() {
  await assertPermission('scheduling.calendar.read');
  const institutes = await organizationService.listInstitutes({
    pageSize: 100,
  });
  return institutes.items as InstituteSummary[];
}

export async function loadSchedulingCalendars(filters: {
  q?: string;
  year?: number;
  status?: 'Draft' | 'Active' | 'Closed' | 'Archived';
}) {
  await assertPermission('scheduling.calendar.read');
  return schedulingCalendarService.listCalendars(filters);
}

export async function loadSchedulingOverview() {
  const session = await getSession();
  const hasCalRead = hasPermission(session, 'scheduling.calendar.read');
  const hasCalCreate = hasPermission(session, 'schedule.manage');
  const hasVenueRead =
    hasPermission(session, 'scheduling.venueBlock.read') ||
    hasPermission(session, 'schedule.manage');
  const hasConflictRead =
    hasPermission(session, 'scheduling.conflict.read') ||
    hasPermission(session, 'schedule.manage');

  const { allowedBranchIds, globalScope } = await loadScopedOrganizationData();

  // 1. Calendars
  let calendars: any[] = [];
  let calendarCounts = { total: 0, active: 0, draft: 0, closed: 0 };
  if (hasCalRead) {
    try {
      calendars = await schedulingCalendarService.listCalendars({});
      calendarCounts = {
        total: calendars.length,
        active: calendars.filter((c) => c.status === 'Active').length,
        draft: calendars.filter((c) => c.status === 'Draft').length,
        closed: calendars.filter((c) => c.status === 'Closed').length,
      };
    } catch (err) {
      console.error('Failed to list calendars in loadSchedulingOverview:', err);
    }
  }

  // 2. Venue Blocks
  let upcomingVenueBlocks: any[] = [];
  let venueBlockCount = 0;
  if (hasVenueRead) {
    try {
      const blockWhere = {
        isDeleted: false,
        status: 'Active',
        blockEndDate: { gte: new Date() },
        ...(globalScope || allowedBranchIds.length === 0
          ? {}
          : { branchId: { in: allowedBranchIds } }),
      };

      venueBlockCount = await prisma.venueBlock.count({ where: blockWhere });
      upcomingVenueBlocks = await prisma.venueBlock.findMany({
        where: blockWhere,
        include: {
          branch: { select: { id: true, branchName: true } },
          classroom: { select: { id: true, classroomName: true } },
        },
        orderBy: { blockStartDate: 'asc' },
        take: 5,
      });
    } catch (err) {
      console.error(
        'Failed to query venue blocks in loadSchedulingOverview:',
        err,
      );
    }
  }

  // 3. Conflicts
  let activeConflicts: any[] = [];
  let conflictCount = 0;
  if (hasConflictRead) {
    try {
      const conflictWhere = {
        isDeleted: false,
        scheduleStatus: 'Conflict' as const,
        ...(globalScope || allowedBranchIds.length === 0
          ? {}
          : { batch: { branchId: { in: allowedBranchIds } } }),
      };

      conflictCount = await prisma.session.count({ where: conflictWhere });
      activeConflicts = await prisma.session.findMany({
        where: conflictWhere,
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
        orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
        take: 5,
      });
    } catch (err) {
      console.error(
        'Failed to query conflicts in loadSchedulingOverview:',
        err,
      );
    }
  }

  return {
    calendars,
    counts: calendarCounts,
    conflicts: {
      items: activeConflicts,
      totalCount: conflictCount,
    },
    venueBlocks: {
      items: upcomingVenueBlocks,
      totalCount: venueBlockCount,
    },
    permissions: {
      hasCalRead,
      hasCalCreate,
      hasVenueRead,
      hasConflictRead,
    },
  };
}

export async function loadCalendarDetail(
  calendarId: string,
  branchId?: string | null,
) {
  await assertPermission('scheduling.calendar.read');
  const session = await getSession();
  const calendar = await schedulingCalendarService.getCalendar(calendarId);
  const branchesResult = await organizationService.listBranches({
    pageSize: 100,
    instituteId: calendar.instituteId,
  });
  const branches = branchesResult.items.map((branch) => ({
    id: branch.id,
    name: branch.branchName,
  }));
  const selectedBranchId =
    branchId ?? session.activeBranchId ?? branches[0]?.id ?? null;
  const resolved = selectedBranchId
    ? await schedulingCalendarService.resolveCalendar(
        selectedBranchId,
        calendar.effectiveStartDate,
        calendar.instituteId,
      )
    : null;

  const holidays = await schedulingCalendarService.listHolidays({
    businessCalendarId: calendarId,
  });
  holidays.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return { calendar, branches, selectedBranchId, resolved, holidays };
}

export async function loadVenueBlocksPageData(searchParams: {
  q?: string;
  branchId?: string;
  classroomId?: string;
  status?: 'Active' | 'Cancelled';
  page?: number;
  limit?: number;
}) {
  await assertAnyPermission([
    'scheduling.venueBlock.read',
    'scheduling.venueBlock.create',
    'schedule.manage',
  ]);
  const { branches, classrooms, allowedBranchIds, globalScope } =
    await loadScopedOrganizationData();
  const page = Number.isFinite(searchParams.page as number)
    ? Math.max(1, Math.floor(searchParams.page as number))
    : 1;
  const limit = Number.isFinite(searchParams.limit as number)
    ? Math.min(Math.max(Math.floor(searchParams.limit as number), 1), 100)
    : 10;

  const selectedBranchId =
    searchParams.branchId &&
    (globalScope || allowedBranchIds.includes(searchParams.branchId))
      ? searchParams.branchId
      : null;

  const selectedClassroomId =
    searchParams.classroomId &&
    classrooms.some((classroom) => classroom.id === searchParams.classroomId)
      ? searchParams.classroomId
      : null;

  const q = normalizeQuery(searchParams.q);
  const where = {
    isDeleted: false,
    ...(globalScope || allowedBranchIds.length === 0
      ? {}
      : { branchId: { in: allowedBranchIds } }),
    ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
    ...(selectedClassroomId ? { classroomId: selectedClassroomId } : {}),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(q
      ? {
          OR: [
            { reasonCode: { contains: q, mode: 'insensitive' as const } },
            { status: { contains: q, mode: 'insensitive' as const } },
            {
              branch: {
                is: {
                  branchName: { contains: q, mode: 'insensitive' as const },
                },
              },
            },
            {
              classroom: {
                is: {
                  classroomName: { contains: q, mode: 'insensitive' as const },
                },
              },
            },
          ],
        }
      : {}),
  };

  const kpiWhere = {
    isDeleted: false,
    ...(globalScope || allowedBranchIds.length === 0
      ? {}
      : { branchId: { in: allowedBranchIds } }),
  };

  const [
    totalCount,
    activeCount,
    cancelledCount,
    branchWideCount,
    venueBlocks,
  ] = await Promise.all([
    prisma.venueBlock.count({ where }),
    prisma.venueBlock.count({ where: { ...kpiWhere, status: 'Active' } }),
    prisma.venueBlock.count({ where: { ...kpiWhere, status: 'Cancelled' } }),
    prisma.venueBlock.count({ where: { ...kpiWhere, classroomId: null } }),
    prisma.venueBlock.findMany({
      where,
      include: {
        branch: {
          select: { id: true, branchName: true },
        },
        classroom: {
          select: { id: true, classroomName: true },
        },
      },
      orderBy: [{ blockStartDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    branches,
    classrooms,
    venueBlocks: venueBlocks as VenueBlockSummary[],
    selectedBranchId,
    selectedClassroomId,
    page,
    limit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    kpis: {
      total: activeCount + cancelledCount, // total matching active + cancelled scoped to branch
      active: activeCount,
      cancelled: cancelledCount,
      branchWide: branchWideCount,
    },
  };
}

export async function loadVenueBlockFormData(venueBlockId?: string) {
  await assertAnyPermission([
    'scheduling.venueBlock.read',
    'scheduling.venueBlock.create',
    'schedule.manage',
  ]);
  const { branches, classrooms } = await loadScopedOrganizationData();

  const venueBlock = venueBlockId
    ? await prisma.venueBlock.findFirst({
        where: { id: venueBlockId, isDeleted: false },
        include: {
          branch: { select: { id: true, branchName: true } },
          classroom: {
            select: { id: true, classroomName: true, branchId: true },
          },
        },
      })
    : null;

  return {
    branches,
    classrooms,
    venueBlock,
  };
}

export async function loadConflictDashboardData(searchParams: {
  q?: string;
  branchId?: string;
  conflictType?: string;
  severity?: 'Conflict' | 'Warning' | 'Published';
}) {
  await assertAnyPermission(['scheduling.conflict.read', 'schedule.manage']);
  const { branches, classrooms, allowedBranchIds, globalScope, session } =
    await loadScopedOrganizationData();

  const selectedBranchId =
    searchParams.branchId &&
    (globalScope || allowedBranchIds.includes(searchParams.branchId))
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
      ...(!searchParams.severity && !searchParams.conflictType
        ? {
            OR: [
              { scheduleStatus: 'Conflict' },
              { isConflictIgnored: true },
              { overrideReason: { not: null } },
              { conflictType: { not: null } },
            ],
          }
        : {}),
      ...(searchParams.severity === 'Conflict'
        ? { scheduleStatus: 'Conflict' }
        : {}),
      ...(searchParams.severity === 'Published'
        ? { scheduleStatus: 'Published' }
        : {}),
      ...(searchParams.severity === 'Warning'
        ? {
            OR: [
              { isConflictIgnored: true },
              { overrideReason: { not: null } },
            ],
          }
        : {}),
      ...(searchParams.conflictType
        ? { conflictType: searchParams.conflictType as any }
        : {}),
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
    orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
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
    conflict: filteredSessions.filter(
      (entry) => entry.scheduleStatus === 'Conflict',
    ).length,
    warning: filteredSessions.filter(
      (entry) =>
        entry.isConflictIgnored ||
        (entry.scheduleStatus === 'Published' && entry.overrideReason),
    ).length,
    holiday: filteredSessions.filter(
      (entry) => entry.conflictType === 'HOLIDAY',
    ).length,
    venue: filteredSessions.filter((entry) => entry.conflictType === 'VENUE')
      .length,
    overlap: filteredSessions.filter(
      (entry) =>
        entry.conflictType === 'TRAINER_OVERLAP' ||
        entry.conflictType === 'CLASSROOM_OVERLAP',
    ).length,
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
