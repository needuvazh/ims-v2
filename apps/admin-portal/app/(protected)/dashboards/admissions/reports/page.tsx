import Link from 'next/link';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  Breadcrumbs,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  StatCard,
} from '@ims/shared-ui';
import {
  ArrowRight,
  FileSpreadsheet,
  Home,
  GraduationCap,
  LayoutDashboard,
  School,
  ShieldCheck,
} from 'lucide-react';

export const metadata = { title: 'Module 04 Reports | IMS Admin' };

export default async function Module04ReportsIndexPage() {
  const cookieStore = await cookies();
  const session = await decodeSession(
    cookieStore.get(sessionCookieName)?.value,
  );

  if (!session) {
    redirect('/login');
  }

  const isSuperAdmin =
    session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');
  const canView =
    isSuperAdmin ||
    session.permissions.includes('admission.read') ||
    session.permissions.includes('student.read') ||
    session.permissions.includes('enrollment.read') ||
    session.permissions.includes('dashboard.view');
  if (!canView) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldCheck className="h-14 w-14 text-rose-500" />
        <h1 className="text-2xl font-bold text-slate-900">Access denied</h1>
        <p className="max-w-md text-sm text-slate-500">
          You do not have permission to view the Module 04 reports area.
        </p>
      </div>
    );
  }

  const { branchScopeResolver, prisma } =
    await import('../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId,
    session.activeBranchId ?? null,
  );
  const branchIds =
    allowedBranchIds.length > 0
      ? allowedBranchIds
      : ['00000000-0000-0000-0000-000000000000'];

  const [
    branchCount,
    studentCount,
    admissionCount,
    enrollmentCount,
    idCardCount,
  ] = await Promise.all([
    prisma.branch.count({ where: { id: { in: branchIds }, isDeleted: false } }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        OR: [
          {
            admissions: {
              some: { branchId: { in: branchIds }, isDeleted: false },
            },
          },
          {
            enrollments: {
              some: { branchId: { in: branchIds }, isDeleted: false },
            },
          },
        ],
      },
    }),
    prisma.admission.count({
      where: { isDeleted: false, branchId: { in: branchIds } },
    }),
    prisma.enrollment.count({
      where: { isDeleted: false, branchId: { in: branchIds } },
    }),
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        idCardIssued: true,
        OR: [
          {
            admissions: {
              some: { branchId: { in: branchIds }, isDeleted: false },
            },
          },
          {
            enrollments: {
              some: { branchId: { in: branchIds }, isDeleted: false },
            },
          },
        ],
      },
    }),
  ]);

  const cards = [
    {
      href: '/dashboards/admissions/reports/students',
      title: 'Student Report',
      desc: 'Profile health, status mix, and identity readiness.',
      icon: GraduationCap,
    },
    {
      href: '/dashboards/admissions/reports/enrollments',
      title: 'Enrollment Report',
      desc: 'Lifecycle counts and pricing readiness.',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboards/admissions/reports/batches',
      title: 'Batch Roster',
      desc: 'Capacity, fill rate, and waitlist pressure.',
      icon: School,
    },
    {
      href: '/dashboards/admissions/reports/id-cards',
      title: 'ID Card Report',
      desc: 'Issuance, pending, and reissue visibility.',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Module 04 Reports"
        description="Branch-scoped operational reporting for admissions, enrollment, batches, and identity issuance."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Admissions',
                href: '/dashboards/admissions',
                icon: (
                  <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                ),
              },
              {
                label: 'Reports',
                icon: (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
                ),
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Branches"
          value={branchCount}
          description="Accessible branch scope"
          icon={<School className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Students"
          value={studentCount}
          description="Visible learner profiles"
          icon={<GraduationCap className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Admissions"
          value={admissionCount}
          description="Scoped admission records"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Enrollments"
          value={enrollmentCount}
          description="Scoped enrollment records"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="ID Cards"
          value={idCardCount}
          description="Issued card profiles"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    Open report{' '}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
