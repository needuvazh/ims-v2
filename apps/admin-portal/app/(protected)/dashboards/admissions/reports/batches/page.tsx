import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@ims/shared-ui';
import { FileSpreadsheet, Home, LayoutDashboard, School } from 'lucide-react';

export const metadata = { title: 'Batch Report | IMS Admin' };

export default async function BatchReportPage() {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);
  if (!session) redirect('/login');

  const { branchScopeResolver, prisma } = await import('../../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(session.userId, session.activeBranchId ?? null);
  const branchIds = allowedBranchIds.length > 0 ? allowedBranchIds : ['00000000-0000-0000-0000-000000000000'];

  const batches = await prisma.batch.findMany({
    where: { isDeleted: false, branchId: { in: branchIds } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 10,
    include: { course: true, enrollments: { where: { isDeleted: false } }, waitlist: { where: { isDeleted: false } } },
  });

  const totalBatches = batches.length;
  const totalWaitlist = batches.reduce((sum, batch) => sum + batch.waitlist.filter((entry) => entry.status === 'Waiting').length, 0);
  const totalPromoted = batches.reduce((sum, batch) => sum + batch.waitlist.filter((entry) => entry.status === 'Promoted').length, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Batch Roster Report"
        description="Capacity, fill rate, and waitlist pressure across the branch scope."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> }, { label: 'Reports', href: '/dashboards/admissions/reports', icon: <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" /> }, { label: 'Batches', icon: <School className="h-3.5 w-3.5 text-slate-500" /> }]} />}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Batches" value={totalBatches} description="Visible roster rows" icon={<School className="h-5 w-5" />} tone="indigo" />
        <StatCard title="Waitlist" value={totalWaitlist} description="Waiting students" icon={<FileSpreadsheet className="h-5 w-5" />} tone="amber" />
        <StatCard title="Promoted" value={totalPromoted} description="Moved from waiting" icon={<LayoutDashboard className="h-5 w-5" />} tone="emerald" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster and capacity</CardTitle>
          <CardDescription>Current enrollment counts and waitlist activity by batch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Fill rate</TableHead>
                <TableHead className="text-right">Waitlist</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const fillRate = batch.capacity > 0 ? Math.round((batch.currentEnrollmentCount / batch.capacity) * 100) : 0;
                return (
                  <TableRow key={batch.id}>
                    <TableCell><Badge variant="outline">{batch.batchCode}</Badge></TableCell>
                    <TableCell>{batch.course?.nameEnglish ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">{batch.currentEnrollmentCount}</TableCell>
                    <TableCell className="text-right">{batch.capacity}</TableCell>
                    <TableCell className="text-right">{fillRate}%</TableCell>
                    <TableCell className="text-right">{batch.waitlist.length}</TableCell>
                    <TableCell className="text-right"><Link href={`/batches/${batch.id}`} className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">Batch</Link></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
