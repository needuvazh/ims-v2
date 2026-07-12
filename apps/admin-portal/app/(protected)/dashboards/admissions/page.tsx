import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Badge,
  Breadcrumbs,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ims/shared-ui';
import {
  Activity,
  BookOpen,
  Clock3,
  GraduationCap,
  Home,
  LayoutDashboard,
  ArrowRight,
  MapPin,
  Users,
  BadgeCheck,
  AlertTriangle,
  School,
  FileEdit,
  Send,
  CheckCircle2,
  UserCheck,
  PlayCircle,
  Flag,
} from 'lucide-react';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';

export const metadata = { title: 'Admissions Dashboard | IMS Admin' };
export const dynamic = 'force-dynamic';

function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function statusTone(status: string) {
  switch (status) {
    case 'Approved':
    case 'Confirmed':
    case 'Active':
    case 'CertificateIssued':
      return 'success';
    case 'Submitted':
    case 'Draft':
      return 'warning';
    case 'Rejected':
    case 'Cancelled':
    case 'Dropped':
      return 'error';
    default:
      return 'muted';
  }
}

export default async function AdmissionsDashboardPage(props: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const session = await decodeSession(
    cookieStore.get(sessionCookieName)?.value,
  );

  if (!session) {
    redirect('/login');
  }

  const isSuperAdmin =
    session.roles.includes('SUPER_ADMIN') || session.roles.includes('ADMIN');

  if (
    !isSuperAdmin &&
    !session.permissions.includes('admission.read') &&
    !session.permissions.includes('dashboard.training') &&
    !session.permissions.includes('dashboard.view')
  ) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-14 w-14 text-rose-500" />
        <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="max-w-md text-sm text-slate-500">
          You do not have permission to view the admissions dashboard.
        </p>
      </div>
    );
  }

  const { branchScopeResolver, prisma } = await import('../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId,
    session.activeBranchId ?? null,
  );
  const scopedBranchIds =
    allowedBranchIds.length > 0
      ? allowedBranchIds
      : ['00000000-0000-0000-0000-000000000000'];
  const requestedBranchId =
    searchParams.branchId && scopedBranchIds.includes(searchParams.branchId)
      ? searchParams.branchId
      : null;
  const branchIds = requestedBranchId ? [requestedBranchId] : scopedBranchIds;

  const [
    branches,
    scopedBatches,
    studentsTotal,
    studentsActive,
    studentsSuspended,
    studentsInactive,
    admissionsDraft,
    admissionsSubmitted,
    admissionsApproved,
    admissionsRejected,
    admissionsCancelled,
    enrollmentsDraft,
    enrollmentsSubmitted,
    enrollmentsApproved,
    enrollmentsConfirmed,
    enrollmentsActive,
    enrollmentsCompleted,
    enrollmentsCancelled,
    enrollmentsDropped,
    batchesOpenForEnrollment,
    batchesInProgress,
    batchesCompleted,
    batchesCancelled,
    idCardsIssued,
    idCardsPending,
    totalBatches,
    admissionsRecent,
    enrollmentsRecent,
    batchRows,
  ] = await Promise.all([
    prisma.branch.findMany({
      where: { id: { in: branchIds }, isDeleted: false },
      select: { id: true, branchName: true },
      orderBy: { branchName: 'asc' },
    }),
    prisma.batch.findMany({
      where: { isDeleted: false, branchId: { in: branchIds } },
      select: { id: true },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
      },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        status: 'Active',
        branchId: { in: branchIds },
      },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        status: 'Suspended',
        branchId: { in: branchIds },
      },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        status: 'Inactive',
        branchId: { in: branchIds },
      },
    }),
    prisma.admission.count({
      where: {
        isDeleted: false,
        studentProfile: {
          branchId: { in: branchIds },
        },
        admissionStatus: 'Draft',
      },
    }),
    prisma.admission.count({
      where: {
        isDeleted: false,
        studentProfile: {
          branchId: { in: branchIds },
        },
        admissionStatus: 'Submitted',
      },
    }),
    prisma.admission.count({
      where: {
        isDeleted: false,
        studentProfile: {
          branchId: { in: branchIds },
        },
        admissionStatus: 'Approved',
      },
    }),
    prisma.admission.count({
      where: {
        isDeleted: false,
        studentProfile: {
          branchId: { in: branchIds },
        },
        admissionStatus: 'Rejected',
      },
    }),
    prisma.admission.count({
      where: {
        isDeleted: false,
        studentProfile: {
          branchId: { in: branchIds },
        },
        admissionStatus: 'Cancelled',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Draft',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Submitted',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Approved',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Confirmed',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Active',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Completed',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Cancelled',
      },
    }),
    prisma.enrollment.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        enrollmentStatus: 'Dropped',
      },
    }),
    prisma.batch.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        status: 'OpenForEnrollment',
      },
    }),
    prisma.batch.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        status: 'InProgress',
      },
    }),
    prisma.batch.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        status: 'Completed',
      },
    }),
    prisma.batch.count({
      where: {
        isDeleted: false,
        branchId: { in: branchIds },
        status: 'Cancelled',
      },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        idCardIssued: true,
        branchId: { in: branchIds },
      },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        idCardIssued: false,
        branchId: { in: branchIds },
      },
    }),
    prisma.batch.count({
      where: { isDeleted: false, branchId: { in: branchIds } },
    }),
    prisma.admission.findMany({
      where: {
        isDeleted: false,
        studentProfile: {
          branchId: { in: branchIds },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        person: true,
        studentProfile: {
          include: {
            branch: true,
          },
        },
        course: true,
      },
    }),
    prisma.enrollment.findMany({
      where: { isDeleted: false, branchId: { in: branchIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        studentProfile: { include: { person: true } },
        branch: true,
        course: true,
        batch: true,
      },
    }),
    prisma.batch.findMany({
      where: { isDeleted: false, branchId: { in: branchIds } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 5,
      include: {
        course: true,
        enrollments: { where: { isDeleted: false } },
        waitlist: { where: { isDeleted: false, status: 'Waiting' } },
      },
    }),
  ]);

  const scopedBatchIds = scopedBatches.map((batch) => batch.id);
  const [waitlistWaiting, waitlistPromoted] = await Promise.all([
    prisma.waitingList.count({
      where: {
        isDeleted: false,
        batchId: { in: scopedBatchIds },
        status: 'Waiting',
      },
    }),
    prisma.waitingList.count({
      where: {
        isDeleted: false,
        batchId: { in: scopedBatchIds },
        status: 'Promoted',
      },
    }),
  ]);

  const resolvedBranchLabel = requestedBranchId
    ? (branches.find((branch) => branch.id === requestedBranchId)?.branchName ??
      'Selected branch')
    : allowedBranchIds.length === branches.length
      ? 'All accessible branches'
      : `${branches.length} accessible branches`;

  const totalAdmissions =
    admissionsDraft +
    admissionsSubmitted +
    admissionsApproved +
    admissionsRejected +
    admissionsCancelled;
  const totalEnrollments =
    enrollmentsDraft +
    enrollmentsSubmitted +
    enrollmentsApproved +
    enrollmentsConfirmed +
    enrollmentsActive +
    enrollmentsCompleted +
    enrollmentsCancelled +
    enrollmentsDropped;
  const totalBatchesInScope = totalBatches;
  const fillRateAverage =
    totalBatchesInScope === 0
      ? 0
      : Math.round(
          batchRows.reduce(
            (sum, batch) =>
              sum + percentage(batch.currentEnrollmentCount, batch.capacity),
            0,
          ) / totalBatchesInScope,
        );

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <PageHeader
        title="Admissions Dashboard"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Dashboards',
                href: '/dashboards/crm',
                icon: (
                  <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                ),
              },
              {
                label: 'Admissions',
                icon: <School className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
      />

      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Branch scope: {resolvedBranchLabel}
            </span>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Admissions Control Panel
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Track the learner pipeline from student profile creation to
              enrollment confirmation and ID card issuance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admissions"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Admissions <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboards/admissions/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/batches"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Batch Roster <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Students"
          value={studentsTotal}
          description={`${studentsActive} active, ${studentsSuspended} suspended`}
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Admissions"
          value={totalAdmissions}
          description={`${admissionsApproved} approved, ${admissionsSubmitted} submitted`}
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Enrollments"
          value={totalEnrollments}
          description={`${enrollmentsActive} active, ${enrollmentsCompleted} completed`}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Avg Batch Fill"
          value={`${fillRateAverage}%`}
          description={`${totalBatchesInScope} batches in scope`}
          icon={<Activity className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Admissions</CardTitle>
            </div>
            <Link
              href="/admissions"
              className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admissionsRecent.map((admission) => (
                  <TableRow key={admission.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[color:var(--ims-ink)]">
                          {admission.admissionNumber}
                        </p>
                        <p className="text-[11px] text-[color:var(--ims-muted)]">
                          {new Date(admission.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[color:var(--ims-ink)]">
                          {admission.person.firstName}{' '}
                          {admission.person.lastName}
                        </p>
                        <p className="text-[11px] text-[color:var(--ims-muted)]">
                          {admission.studentProfile?.branch?.branchName || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[color:var(--ims-muted)]">
                      {admission.course?.nameEnglish ?? 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusTone(admission.admissionStatus)}>
                        {admission.admissionStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Enrollments</CardTitle>
            </div>
            <Link
              href="/batches"
              className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline"
            >
              Open batches
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enrollment</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollmentsRecent.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[color:var(--ims-ink)]">
                          {enrollment.enrollmentNumber}
                        </p>
                        <p className="text-[11px] text-[color:var(--ims-muted)]">
                          {enrollment.branch.branchName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[color:var(--ims-ink)]">
                          {enrollment.studentProfile.person.firstName}{' '}
                          {enrollment.studentProfile.person.lastName}
                        </p>
                        <p className="text-[11px] text-[color:var(--ims-muted)]">
                          {enrollment.course.nameEnglish}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[color:var(--ims-muted)]">
                      {enrollment.batch?.batchCode ?? 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusTone(enrollment.enrollmentStatus)}>
                        {enrollment.enrollmentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-[color:var(--ims-brass)]" />{' '}
              Pipeline Snapshot
            </CardTitle>
            <CardDescription>
              Current status distribution for admissions and enrollments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-5">
              {/* Vertical Line Connector */}
              <div className="absolute left-[18px] top-2 bottom-2 w-[2px] bg-slate-100" />

              {[
                {
                  label: 'Admission Draft',
                  value: admissionsDraft,
                  icon: FileEdit,
                  color: 'text-amber-500',
                  bgColor: 'bg-amber-50',
                  borderColor: 'border-amber-200',
                },
                {
                  label: 'Admission Submitted',
                  value: admissionsSubmitted,
                  icon: Send,
                  color: 'text-blue-500',
                  bgColor: 'bg-blue-50',
                  borderColor: 'border-blue-200',
                },
                {
                  label: 'Admission Approved',
                  value: admissionsApproved,
                  icon: CheckCircle2,
                  color: 'text-emerald-500',
                  bgColor: 'bg-emerald-50',
                  borderColor: 'border-emerald-200',
                },
                {
                  label: 'Enrollment Confirmed',
                  value: enrollmentsConfirmed,
                  icon: UserCheck,
                  color: 'text-indigo-500',
                  bgColor: 'bg-indigo-50',
                  borderColor: 'border-indigo-200',
                },
                {
                  label: 'Enrollment Active',
                  value: enrollmentsActive,
                  icon: PlayCircle,
                  color: 'text-violet-500',
                  bgColor: 'bg-violet-50',
                  borderColor: 'border-violet-200',
                },
                {
                  label: 'Enrollment Completed',
                  value: enrollmentsCompleted,
                  icon: Flag,
                  color: 'text-slate-500',
                  bgColor: 'bg-slate-50',
                  borderColor: 'border-slate-200',
                },
              ].map((stage, idx) => (
                <div
                  key={idx}
                  className="group relative flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white ${stage.bgColor} ${stage.color} ${stage.borderColor} shadow-sm transition-transform group-hover:scale-110`}
                    >
                      <stage.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="text-xs font-semibold uppercase tracking-wider text-[color:var(--ims-muted)]"
                        style={{ fontSize: '10px' }}
                      >
                        Stage {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-[color:var(--ims-ink)]">
                        {stage.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-[color:var(--ims-ink)]">
                      {stage.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[color:var(--ims-brass)]" />{' '}
              Batch Health
            </CardTitle>
            <CardDescription>Fill rate, waitlist, and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-[color:var(--ims-border)] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  Open
                </p>
                <p className="mt-1 text-xl font-bold">
                  {batchesOpenForEnrollment}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--ims-border)] p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  In Progress
                </p>
                <p className="mt-1 text-xl font-bold">{batchesInProgress}</p>
              </div>
            </div>
            <div className="space-y-3">
              {batchRows.slice(0, 3).map((batch) => {
                const fill = percentage(
                  batch.currentEnrollmentCount,
                  batch.capacity,
                );
                return (
                  <div
                    key={batch.id}
                    className="space-y-1.5 rounded-xl border border-[color:var(--ims-border)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[color:var(--ims-ink)]">
                          {batch.batchCode}
                        </p>
                      </div>
                      <Badge
                        variant={
                          batch.status === 'Completed'
                            ? 'success'
                            : batch.status === 'Cancelled'
                              ? 'error'
                              : 'default'
                        }
                      >
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--ims-border)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--ims-brass)]"
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[color:var(--ims-muted)]">
                      <span>
                        {batch.currentEnrollmentCount}/{batch.capacity}
                      </span>
                      <span>{fill}% full</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[color:var(--ims-brass)]" /> ID
              Card Status
            </CardTitle>
            <CardDescription>Issuance readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ims-muted)]">Issued</span>
              <strong>{idCardsIssued}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ims-muted)]">Pending</span>
              <strong>{idCardsPending}</strong>
            </div>
            <div className="rounded-xl border border-[color:var(--ims-border)] p-3 text-xs text-[color:var(--ims-muted)]">
              Student ID card generation uses shared profile flags.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Move from metrics to operations immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admissions"
              className="group rounded-xl border border-[color:var(--ims-border)] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-semibold text-[color:var(--ims-ink)]">
                Admissions
              </p>
              <p className="mt-1 text-xs text-[color:var(--ims-muted)]">
                Open the full intake register.
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--ims-brass)]">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link
              href="/batches"
              className="group rounded-xl border border-[color:var(--ims-border)] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-semibold text-[color:var(--ims-ink)]">
                Batch Roster
              </p>
              <p className="mt-1 text-xs text-[color:var(--ims-muted)]">
                Review fill rates and waitlists.
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--ims-brass)]">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scope Summary</CardTitle>
            <CardDescription>
              Branch selection and current operational coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ims-muted)]">
                Allowed branches
              </span>
              <strong>{branches.length}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ims-muted)]">
                Students in scope
              </span>
              <strong>{studentsTotal}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ims-muted)]">
                Batch coverage
              </span>
              <strong>{totalBatchesInScope}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ims-muted)]">
                Pending waitlist
              </span>
              <strong>{waitlistWaiting}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
