import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession, sessionCookieName } from '@ims/shared-auth';
import { Breadcrumbs, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@ims/shared-ui';
import { FileSpreadsheet, Home, LayoutDashboard, School } from 'lucide-react';

export const metadata = { title: 'Enrollment Report | IMS Admin' };

export default async function EnrollmentReportPage() {
  const cookieStore = await cookies();
  const session = await decodeSession(cookieStore.get(sessionCookieName)?.value);
  if (!session) redirect('/login');

  const { branchScopeResolver, prisma } = await import('../../../../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(session.userId, session.activeBranchId ?? null);
  const branchIds = allowedBranchIds.length > 0 ? allowedBranchIds : ['00000000-0000-0000-0000-000000000000'];

  const [draftCount, submittedCount, approvedCount, confirmedCount, activeCount, completedCount, cancelledCount, droppedCount, paymentValidationCount, batches] = await Promise.all([
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Draft' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Submitted' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Approved' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Confirmed' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Active' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Completed' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Cancelled' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, enrollmentStatus: 'Dropped' } }),
    prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, paymentValidationRequired: true } }),
    prisma.enrollment.findMany({ where: { isDeleted: false, branchId: { in: branchIds } }, take: 6, orderBy: { createdAt: 'desc' }, include: { course: true, batch: true, branch: true } }),
  ]);

  const pricingGlobal = await prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, pricingSource: 'GlobalDefault' } });
  const pricingBatch = await prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, pricingSource: 'BatchLevel' } });
  const pricingBranch = await prisma.enrollment.count({ where: { isDeleted: false, branchId: { in: branchIds }, pricingSource: 'BranchLevel' } });

  const total = draftCount + submittedCount + approvedCount + confirmedCount + activeCount + completedCount + cancelledCount + droppedCount;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Enrollment Report"
        description="Lifecycle counts, pricing source mix, and payment validation readiness."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5 text-slate-400" /> }, { label: 'Reports', href: '/dashboards/admissions/reports', icon: <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" /> }, { label: 'Enrollments', icon: <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" /> }]} />}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={total} description="Scoped enrollment records" icon={<FileSpreadsheet className="h-5 w-5" />} tone="indigo" />
        <StatCard title="Payment Validation" value={paymentValidationCount} description="Enrollments needing fee validation" icon={<School className="h-5 w-5" />} tone="amber" />
        <StatCard title="Pricing Source Mix" value={`${pricingBatch}/${pricingBranch}/${pricingGlobal}`} description="Batch / branch / global" icon={<LayoutDashboard className="h-5 w-5" />} tone="emerald" />
        <StatCard title="Completed" value={completedCount} description="Finished learning cycles" icon={<FileSpreadsheet className="h-5 w-5" />} tone="sky" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle overview</CardTitle>
          <CardDescription>Enrollment states and pricing mix in the selected scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Draft', draftCount],
                ['Submitted', submittedCount],
                ['Approved', approvedCount],
                ['Confirmed', confirmedCount],
                ['Active', activeCount],
                ['Completed', completedCount],
                ['Cancelled', cancelledCount],
                ['Dropped', droppedCount],
              ].map(([label, count]) => (
                <TableRow key={label as string}>
                  <TableCell><Badge variant="outline">{label}</Badge></TableCell>
                  <TableCell className="text-right font-semibold">{count as number}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent enrollments</CardTitle>
          <CardDescription>Most recent rows with pricing and batch links.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enrollment</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{enrollment.enrollmentNumber}</div>
                    <div className="text-xs text-slate-500">{enrollment.branch.branchName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600">{enrollment.pricingSource}</div>
                    <div className="text-xs text-slate-500">{enrollment.paymentValidationRequired ? 'Payment validation required' : 'No validation required'}</div>
                  </TableCell>
                  <TableCell>{enrollment.batch?.batchCode ?? 'N/A'}</TableCell>
                  <TableCell className="text-right"><Link href={`/enrollments/${enrollment.id}`} className="text-sm font-semibold text-[color:var(--ims-brass)] hover:underline">Console</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
