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
  Home,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';

export const metadata = { title: 'ID Card Report | IMS Admin' };

export default async function IdCardReportPage() {
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

  const scopedStudentIds = (
    await prisma.studentProfile.findMany({
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
      select: { id: true },
    })
  ).map((student) => student.id);
  const students = await prisma.studentProfile.findMany({
    where: {
      isDeleted: false,
      idCardIssued: true,
      idCardNumber: null,
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
    take: 8,
    orderBy: { joinedAt: 'desc' },
    include: { person: true },
  });

  const [
    issuedCount,
    pendingCount,
    missingNumberCount,
    reissuedCount,
    expiredCount,
  ] = await Promise.all([
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
        idCardIssued: true,
        idCardNumber: null,
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
    prisma.studentIdCardHistory.count({
      where: {
        eventType: 'Reissue',
        studentProfileId: { in: scopedStudentIds },
      },
    }),
    prisma.studentIdCardHistory.count({
      where: {
        eventType: 'Expire',
        studentProfileId: { in: scopedStudentIds },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="ID Card Report"
        description="Identity issuance readiness and exception coverage for the active branch scope."
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
                label: 'ID Cards',
                icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />,
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Issued"
          value={issuedCount}
          description="Profiles with cards"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          description="Awaiting issuance"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Missing Number"
          value={missingNumberCount}
          description="Issued without number"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          tone="rose"
        />
        <StatCard
          title="Reissued"
          value={reissuedCount}
          description="Reissue history entries"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Expired"
          value={expiredCount}
          description="Expired history entries"
          icon={<LayoutDashboard className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profiles missing a number</CardTitle>
          <CardDescription>
            Students with issued cards but no stored card number should be
            reviewed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
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
                      variant={student.idCardIssued ? 'success' : 'outline'}
                    >
                      {student.idCardIssued ? 'Issued' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/students/${student.id}#id-card-management`}
                      className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline"
                    >
                      Manage
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
