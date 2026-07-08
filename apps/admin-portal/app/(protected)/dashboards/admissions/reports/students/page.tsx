import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import {
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
  Badge,
} from '@ims/shared-ui';
import {
  FileSpreadsheet,
  GraduationCap,
  Home,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';

export const metadata = { title: 'Student Report | IMS Admin' };

export default async function StudentReportPage() {
  const cookieStore = await cookies();
  const session = await decodeSession(
    cookieStore.get(sessionCookieName)?.value,
  );
  if (!session) redirect('/login');

  const { branchScopeResolver, prisma } =
    await import('../../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId,
    session.activeBranchId ?? null,
  );
  const branchIds =
    allowedBranchIds.length > 0
      ? allowedBranchIds
      : ['00000000-0000-0000-0000-000000000000'];

  const [
    activeCount,
    suspendedCount,
    inactiveCount,
    issuedCount,
    pendingCount,
    completeProfileCount,
    students,
  ] = await Promise.all([
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        status: 'Active',
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
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        status: 'Suspended',
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
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        status: 'Inactive',
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
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        idCardIssued: false,
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
    prisma.studentProfile.count({
      where: {
        isDeleted: false,
        person: {
          email: { not: '' },
          mobile: { not: '' },
          nationalId: { not: '' },
        },
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
    prisma.studentProfile.findMany({
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
      orderBy: { joinedAt: 'desc' },
      take: 8,
      include: {
        person: true,
        admissions: {
          where: { isDeleted: false },
          select: { id: true, admissionNumber: true, admissionStatus: true },
        },
        enrollments: {
          where: { isDeleted: false },
          select: { id: true, enrollmentStatus: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Student Report"
        description="Profile health and identity readiness across the active branch scope."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5 text-slate-400" />,
              },
              {
                label: 'Reports',
                href: '/dashboards/admissions/reports',
                icon: (
                  <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                ),
              },
              {
                label: 'Students',
                icon: <GraduationCap className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Active"
          value={activeCount}
          description="Operational student profiles"
          icon={<GraduationCap className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Suspended"
          value={suspendedCount}
          description="Temporarily inactive"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Inactive"
          value={inactiveCount}
          description="Not currently active"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Profile Complete"
          value={completeProfileCount}
          description="Profiles with key identity fields"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="sky"
        />
        <StatCard
          title="ID Issued"
          value={issuedCount}
          description="Profiles with issued cards"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="teal"
        />
        <StatCard
          title="Pending Verification"
          value={pendingCount}
          description="Awaiting identity issuance"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="indigo"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent student profiles</CardTitle>
          <CardDescription>
            Latest learners visible in your branch scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admissions</TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-800">
                      {student.person.firstName} {student.person.lastName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {student.studentNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.status === 'Active' ? 'success' : 'outline'
                      }
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {student.admissions.length}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {student.enrollments.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline"
                    >
                      Profile
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
