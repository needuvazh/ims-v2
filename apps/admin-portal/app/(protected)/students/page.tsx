import { assertPermission } from '@/lib/auth-guard';
import { Card, PageHeader, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Input, Button } from '@ims/shared-ui';
import { Search, Users, Eye, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Student Directory - Admin Portal | ASTI IMS' };

export default async function StudentLookupPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
    admissionStatus?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('student.read');

  const query = searchParams.q || '';
  const statusFilter = searchParams.status || '';
  const branchFilter = searchParams.branchId || '';
  const admissionFilter = searchParams.admissionStatus || '';

  const { branchScopeResolver, studentQueryService, prisma } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // Fetch branches for filter selection
  const branches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds }, isDeleted: false },
    select: { id: true, branchName: true, branchCode: true },
  });

  const result = await studentQueryService.searchBranchScopedStudents(
    query,
    allowedBranchIds as string[],
    {
      page: 1,
      limit: 50,
      studentStatus: statusFilter || undefined,
      branchId: branchFilter || undefined,
      admissionStatus: admissionFilter || undefined,
    }
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Academic Operations"
        title="Student Directory"
        description="Browse branch-scoped student profiles, check enrollment history, and manage academic records."
      />

      <Card className="p-6">
        {/* Filters and search Form */}
        <form method="GET" className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end pb-4 border-b border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search query</label>
            <div className="relative">
              <Input
                name="q"
                defaultValue={query}
                placeholder="Name, number, email..."
                className="w-full pl-9"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="flex h-10 w-full rounded-lg border border-[#c1c7ce]/60 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[color:var(--ims-brass)]"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Scope</label>
            <select
              name="branchId"
              defaultValue={branchFilter}
              className="flex h-10 w-full rounded-lg border border-[#c1c7ce]/60 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-[color:var(--ims-brass)]"
            >
              <option value="">All Allowed Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName} ({b.branchCode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Apply Filters
            </Button>
            <Link href="/students">
              <Button type="button" variant="outline">
                Clear
              </Button>
            </Link>
          </div>
        </form>

        <div className="flex items-center justify-between pt-4">
          <h3 className="text-sm font-semibold uppercase flex items-center gap-2">
            <Users className="h-4 w-4 text-[color:var(--ims-primary)]" /> Student Records ({result.total})
          </h3>
        </div>

        {result.items.length === 0 ? (
          <div className="p-12 text-center text-sm text-[color:var(--ims-muted)] flex flex-col items-center justify-center gap-2">
            <Users className="h-8 w-8 text-slate-300 stroke-[1.5]" />
            <p className="font-medium text-slate-500">No students found matching filters.</p>
            <p className="text-xs text-slate-400">Try adjusting your query or selecting another campus scope.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Contact (Masked)</TableHead>
                  <TableHead>Admissions</TableHead>
                  <TableHead>Active Courses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((s: any) => {
                  const activeEnrollments = s.enrollments?.filter((e: any) =>
                    ['Confirmed', 'Active'].includes(e.enrollmentStatus)
                  ) || [];

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-bold text-slate-600 text-xs">
                        {s.studentNumber}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {s.person.firstName} {s.person.lastName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 space-y-0.5">
                        <div>{s.person.mobile || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">{s.person.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        {s.admissions?.map((adm: any) => (
                          <div key={adm.id} className="flex items-center gap-1.5">
                            <Badge variant={adm.admissionStatus === 'Approved' ? 'success' : 'outline'} className="text-[10px] py-0 px-1.5">
                              {adm.admissionStatus}
                            </Badge>
                            <Link
                              href={`/admissions/${adm.id}`}
                              className="text-[11px] text-[color:var(--ims-primary)] hover:underline font-mono"
                            >
                              {adm.admissionNumber}
                            </Link>
                          </div>
                        )) || <span className="text-xs text-slate-400">None</span>}
                      </TableCell>
                      <TableCell>
                        {activeEnrollments.length === 0 ? (
                          <span className="text-xs text-slate-400">No active course</span>
                        ) : (
                          <div className="space-y-1 max-w-[200px]">
                            {activeEnrollments.map((enr: any) => (
                              <div key={enr.id} className="truncate text-xs flex items-center gap-1">
                                <GraduationCap className="h-3 w-3 shrink-0 text-slate-400" />
                                <Link
                                  href={`/enrollments/${enr.id}`}
                                  className="text-[color:var(--ims-primary)] hover:underline truncate"
                                  title={enr.course.nameEnglish}
                                >
                                  {enr.course.nameEnglish}
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'Active' ? 'success' : 'outline'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/students/${s.id}`}>
                          <Button variant="outline" size="sm" className="h-8 gap-1">
                            <Eye className="h-3 w-3" /> Profile
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
