import Link from 'next/link';
import {
  ClipboardList,
  Layers,
  BarChart3,
  Users,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ArrowRight,
  PlayCircle,
  Home,
  Check,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LinkButton,
  PageHeader,
  Breadcrumbs,
  StatCard,
  Badge,
} from '@ims/shared-ui';
import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';

export const metadata = { title: 'Attendance Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  if (status === 'Draft' || status === 'Open')
    return <Badge variant="info">{status}</Badge>;
  if (status === 'Submitted') return <Badge variant="success">{status}</Badge>;
  if (status === 'Locked') return <Badge variant="default">{status}</Badge>;
  if (status === 'Reopened') return <Badge variant="outline">{status}</Badge>;
  if (status === 'Cancelled') return <Badge variant="error">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default async function AttendanceDashboardPage() {
  const session = await assertPermission('attendance.dashboard.view');
  const { branchScopeResolver, attendanceQueryService } =
    await import('@/lib/runtime');

  const allowedBranchIds = (
    await branchScopeResolver.resolveAllowedBranches(
      session.userId as any,
      session.activeBranchId as any,
    )
  ).map((value) => String(value));

  const summaryBranchId =
    (session.activeBranchId && allowedBranchIds.includes(session.activeBranchId)
      ? session.activeBranchId
      : allowedBranchIds[0]) ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Queries for stats
  const [
    activeSessionsCount,
    todaySessions,
    pendingCorrectionsCount,
    branchSummary,
  ] = await Promise.all([
    // Active Sessions Today
    prisma.attendanceSession.count({
      where: {
        isDeleted: false,
        branchId: { in: allowedBranchIds },
        attendanceDate: today,
      },
    }),
    // Today's sessions statuses for completion rate
    prisma.attendanceSession.findMany({
      where: {
        isDeleted: false,
        branchId: { in: allowedBranchIds },
        attendanceDate: today,
      },
      select: { status: true },
    }),
    // Pending Corrections
    prisma.attendanceCorrection.count({
      where: {
        isDeleted: false,
        branchId: { in: allowedBranchIds },
        status: 'Pending',
      },
    }),
    // Branch summary for at-risk count
    summaryBranchId
      ? attendanceQueryService.branchSummary(summaryBranchId, allowedBranchIds)
      : Promise.resolve([]),
  ]);

  const completedToday = todaySessions.filter(
    (s) => s.status === 'Submitted' || s.status === 'Locked',
  ).length;
  const markingCompletionRate =
    todaySessions.length > 0
      ? Math.round((completedToday / todaySessions.length) * 100)
      : 100;

  const atRiskCount = branchSummary.filter(
    (item: any) => item.attendancePercentage < 75,
  ).length;

  // List data for widgets
  const [todaySessionsList, pendingCorrectionsList] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        isDeleted: false,
        branchId: { in: allowedBranchIds },
        attendanceDate: today,
      },
      include: {
        session: {
          include: { batch: true },
        },
        records: {
          where: { isDeleted: false },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.attendanceCorrection.findMany({
      where: {
        isDeleted: false,
        branchId: { in: allowedBranchIds },
        status: 'Pending',
      },
      include: {
        attendanceRecord: {
          include: {
            attendanceSession: {
              include: { batch: true, session: true },
            },
            studentProfile: {
              include: { person: true },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 5,
    }),
  ]);

  const shortcuts = [
    {
      title: 'Sessions & Marking',
      desc: 'Browse sessions and record student rosters',
      href: '/attendance/sessions',
      icon: ClipboardList,
      iconColor:
        'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
    },
    {
      title: 'Corrections Queue',
      desc: 'Approve or reject student attendance modifications',
      href: '/attendance/corrections',
      icon: Clock3,
      iconColor:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    },
    {
      title: 'Reports & Heatmaps',
      desc: 'Run analysis and check batch attendance matrices',
      href: '/attendance/reports',
      icon: BarChart3,
      iconColor:
        'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Attendance',
                icon: <ClipboardList className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5 animate-fade-in-up">
        <StatCard
          title="Active Today"
          value={activeSessionsCount}
          description="Classes scheduled for today"
          icon={<PlayCircle className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Completion Rate"
          value={`${markingCompletionRate}%`}
          description={`${completedToday} of ${todaySessions.length} sessions marked`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Pending Reviews"
          value={pendingCorrectionsCount}
          description="Correction requests awaiting audit"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Students At Risk"
          value={atRiskCount}
          description="Attendance rate under 75%"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left Column: Today's Schedule & Shortcuts */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>
                  Sessions running today. Click mark to register attendance.
                </CardDescription>
              </div>
              <LinkButton
                href="/attendance/sessions"
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                View all sessions <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySessionsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8" />
                  No classes scheduled in this branch for today.
                </div>
              ) : (
                todaySessionsList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 transition hover:border-[color:var(--ims-brass)]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[color:var(--ims-ink)]">
                        {item.session.titleEnglish}
                      </p>
                      <p className="text-xs text-[color:var(--ims-muted)]">
                        Batch:{' '}
                        <span className="font-mono">
                          {item.session.batch.batchCode}
                        </span>{' '}
                        · Session #{item.session.sessionNumber} ·{' '}
                        {item.records.length} records
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {statusBadge(item.status)}
                      <LinkButton
                        href={`/attendance/sessions?sessionId=${item.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        {item.status === 'Draft' || item.status === 'Open'
                          ? 'Mark'
                          : 'View'}
                      </LinkButton>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Shortcuts</CardTitle>
              <CardDescription>Quick links to core workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <Link
                    key={shortcut.title}
                    href={shortcut.href}
                    className="group flex flex-col items-center justify-center rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-5 text-center transition hover:border-[color:var(--ims-brass)] hover:shadow-md"
                  >
                    <div
                      className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105 ${shortcut.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-bold text-[color:var(--ims-ink)] text-sm group-hover:text-[color:var(--ims-brass)] transition-colors">
                      {shortcut.title}
                    </p>
                    <p className="text-xs text-[color:var(--ims-muted)] mt-1 line-clamp-2">
                      {shortcut.desc}
                    </p>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Corrections & Notes */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Corrections</CardTitle>
                <CardDescription>Awaiting reviewer audit.</CardDescription>
              </div>
              <LinkButton
                href="/attendance/corrections"
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                Queue <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingCorrectionsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-8 text-center text-sm text-[color:var(--ims-muted)]">
                  <Check className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  All corrections processed. Clean queue!
                </div>
              ) : (
                pendingCorrectionsList.map((item) => (
                  <Link
                    key={item.id}
                    href="/attendance/corrections"
                    className="block rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 transition hover:border-[color:var(--ims-brass)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[color:var(--ims-ink)] text-sm">
                          {
                            item.attendanceRecord.studentProfile.person
                              .firstName
                          }{' '}
                          {item.attendanceRecord.studentProfile.person.lastName}
                        </p>
                        <p className="text-xs text-[color:var(--ims-muted)] mt-0.5 line-clamp-1">
                          Batch:{' '}
                          {
                            item.attendanceRecord.attendanceSession.batch
                              .batchCode
                          }
                        </p>
                        <p className="text-[11px] text-[color:var(--ims-muted)] mt-1 truncate">
                          Correction:{' '}
                          <span className="font-semibold">
                            {item.oldStatus}
                          </span>{' '}
                          &rarr;{' '}
                          <span className="font-semibold">
                            {item.newStatus}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-[color:var(--ims-muted)] font-mono">
                        {new Date(item.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
