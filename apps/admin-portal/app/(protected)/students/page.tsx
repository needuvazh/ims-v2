import { assertPermission } from '@/lib/auth-guard';
import { Card, CardHeader, CardContent, CardFooter, PageHeader, ResponsiveDataTable, Badge, Input, Button, StatCard, AdminListPageLayout, EmptyState, DataTableFilter } from '@ims/shared-ui';
import { Search, Users, Eye, GraduationCap, Plus, CheckCircle2, Clock3, Archive } from 'lucide-react';
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
  const canCreateStudent = session.permissions.includes('student.create') || session.permissions.includes('student.write');
  const canReadAdmissions = session.permissions.includes('student.related.admission.read');
  const canReadEnrollments = session.permissions.includes('student.related.enrollment.read');
  const canManageIdCard = session.permissions.includes('student.id_card.issue') || session.permissions.includes('student.idcard.manage');

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

  const visibleStudents = result.items;
  const activeCount = visibleStudents.filter((student: any) => student.status === 'Active').length;
  const suspendedCount = visibleStudents.filter((student: any) => student.status === 'Suspended').length;
  const archivedCount = visibleStudents.filter((student: any) => student.status === 'Archived').length;

  const columns = [
    { header: 'Student ID', render: (s: any) => <span className="font-mono font-bold text-slate-600 text-xs">{s.studentNumber}</span> },
    {
      header: 'Full Name',
      render: (s: any) => (
        <div className="font-bold text-slate-800">
          {s.person.firstName} {s.person.lastName}
        </div>
      )
    },
    {
      header: 'Contact',
      render: (s: any) => (
        <div className="text-xs text-slate-500 space-y-0.5">
          <div>{s.person.mobile || 'N/A'}</div>
          <div className="text-[10px] text-slate-400">{s.person.email || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Admissions',
      render: (s: any) => (
        <div className="space-y-1">
          {s.admissions?.map((adm: any) => (
            <div key={adm.id} className="flex items-center gap-1.5">
              <Badge variant={adm.admissionStatus === 'Approved' ? 'success' : 'outline'} className="text-[10px] py-0 px-1.5">
                {adm.admissionStatus}
              </Badge>
              <Link href={`/admissions/${adm.id}`} className="text-[11px] text-[var(--ims-primary)] hover:underline font-mono">
                {adm.admissionNumber}
              </Link>
            </div>
          )) || <span className="text-xs text-slate-400">None</span>}
        </div>
      )
    },
    {
      header: 'Courses',
      render: (s: any) => {
        const active = s.enrollments?.filter((e: any) => ['Confirmed', 'Active'].includes(e.enrollmentStatus)) || [];
        return (
          <div className="space-y-1 max-w-[200px]">
            {active.length === 0 ? <span className="text-xs text-slate-400">No active course</span> : active.map((enr: any) => (
              <div key={enr.id} className="truncate text-xs flex items-center gap-1">
                <GraduationCap className="h-3 w-3 shrink-0 text-slate-400" />
                <Link href={`/enrollments/${enr.id}`} className="text-[var(--ims-primary)] hover:underline truncate">
                  {enr.course.nameEnglish}
                </Link>
              </div>
            ))}
          </div>
        );
      }
    },
    { header: 'Status', render: (s: any) => <Badge variant={s.status === 'Active' ? 'success' : 'outline'}>{s.status}</Badge> },
    {
      header: 'Actions',
      className: 'text-right',
      render: (s: any) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/students/${s.id}`}>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Eye className="h-3 w-3" /> Profile
            </Button>
          </Link>
        </div>
      )
    }
  ];

  const renderCard = (s: any) => {
    const active = s.enrollments?.filter((e: any) => ['Confirmed', 'Active'].includes(e.enrollmentStatus)) || [];
    return (
      <Card className="hover:border-[var(--ims-brass)] transition-colors">
        <CardHeader className="p-card-p border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
                {s.studentNumber}
              </p>
              <p className="text-sm font-bold text-[var(--ims-ink)]">
                {s.person.firstName} {s.person.lastName}
              </p>
            </div>
            <Badge variant={s.status === 'Active' ? 'success' : 'outline'}>{s.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-card-p space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Contact</p>
              <p>{s.person.mobile || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[var(--ims-muted)]">Active Course</p>
              <p className="truncate text-[var(--ims-brass)] font-medium">
                {active[0]?.course.nameEnglish || 'None'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-card-p pt-0 flex gap-2">
           <Link href={`/students/${s.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-[11px]">
                <Eye className="h-3.5 w-3.5 mr-1.5" /> View Profile
              </Button>
           </Link>
           {canReadAdmissions && s.admissions?.[0] && (
             <Link href={`/admissions/${s.admissions[0].id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-[11px]">
                  Admissions
                </Button>
             </Link>
           )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <AdminListPageLayout>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader
          eyebrow="Academic Operations"
          title="Student Directory"
          description="Browse branch-scoped student profiles, check enrollment history, and manage academic records."
        />
        {canCreateStudent && (
          <Link href="/students/new" className="shrink-0">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Create Student
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Students"
          value={result.total}
          description="Branch-scoped records in view"
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Active"
          value={activeCount}
          description="Operational student profiles"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="Suspended"
          value={suspendedCount}
          description="Temporarily inactive profiles"
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Archived"
          value={archivedCount}
          description="Soft-deleted records"
          icon={<Archive className="h-5 w-5" />}
          tone="violet"
        />
      </div>

      <Card className="p-card-p">
        {/* Filters and search Form */}
        <DataTableFilter searchPlaceholder="Search students by name, number, email..." />

        <div className="flex items-center justify-between pt-4">
          <h3 className="text-sm font-semibold uppercase flex items-center gap-2">
            <Users className="h-4 w-4 text-[color:var(--ims-primary)]" /> Student Records ({result.total})
          </h3>
        </div>

        <div className="mt-4">
          <ResponsiveDataTable
            data={result.items}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(s) => s.id}
            emptyState={
              <EmptyState
                icon={<Users className="h-8 w-8 text-slate-300 stroke-[1.5]" />}
                title="No students found"
                description="No students found matching your current filter criteria."
              />
            }
          />
        </div>
      </Card>
    </AdminListPageLayout>
  );
}
