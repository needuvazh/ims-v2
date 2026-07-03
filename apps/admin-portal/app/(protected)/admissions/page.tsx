import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { AdmissionsClientList } from './_components/admissions-client-list';
import Link from 'next/link';

export const metadata = { title: 'Admissions - CRM | ASTI IMS' };

export default async function AdmissionsPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('admission.read');

  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  let filterBranchIds = allowedBranchIds.map(id => id as string);
  if (filterBranchIds.length === 0) {
    filterBranchIds = ['00000000-0000-0000-0000-000000000000'];
  } else if (searchParams.branchId) {
    const requestedBranchId = searchParams.branchId;
    if (filterBranchIds.includes(requestedBranchId)) {
      filterBranchIds = [requestedBranchId];
    } else {
      filterBranchIds = ['00000000-0000-0000-0000-000000000000'];
    }
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    isDeleted: false,
  };

  if (filterBranchIds.length > 0) {
    whereClause.branchId = { in: filterBranchIds };
  }

  if (searchParams.status) {
    whereClause.admissionStatus = searchParams.status;
  }

  if (searchParams.q) {
    whereClause.OR = [
      { admissionNumber: { contains: searchParams.q, mode: 'insensitive' } },
      { person: { firstName: { contains: searchParams.q, mode: 'insensitive' } } },
      { person: { lastName: { contains: searchParams.q, mode: 'insensitive' } } },
      { person: { email: { contains: searchParams.q, mode: 'insensitive' } } },
    ];
  }

  const [admissions, total] = await Promise.all([
    prisma.admission.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        person: true,
        branch: true,
        course: true,
      },
    }),
    prisma.admission.count({
      where: whereClause,
    }),
  ]);

  const mappedAdmissions = admissions.map((adm) => ({
    id: adm.id,
    admissionNumber: adm.admissionNumber,
    admissionStatus: adm.admissionStatus,
    admissionDate: adm.admissionDate.toISOString(),
    createdAt: adm.createdAt.toISOString(),
    branchName: adm.branch.branchName,
    courseName: adm.course?.nameEnglish || 'N/A',
    studentName: `${adm.person.firstName} ${adm.person.lastName}`,
    studentEmail: adm.person.email || 'N/A',
    studentMobile: adm.person.mobile || 'N/A',
  }));

  const branches = await prisma.branch.findMany({
    where: {
      isDeleted: false,
      id: allowedBranchIds.length > 0 ? { in: allowedBranchIds } : undefined,
    },
    select: { id: true, branchName: true },
  });

  const courses = await prisma.course.findMany({
    where: { status: 'Published', isDeleted: false },
    select: { id: true, nameEnglish: true },
  });

  const { studentQueryService } = await import('@/lib/runtime');
  const result = await studentQueryService.searchBranchScopedStudents(
    '',
    allowedBranchIds as string[],
    { page: 1, limit: 100, studentStatus: 'Active' }
  );
  const students = result.items;

  // Calculate high-level KPIs for Admissions
  const kpiWhere = {
    isDeleted: false,
    branchId: allowedBranchIds.length > 0 ? { in: allowedBranchIds.map(id => id as string) } : undefined,
  };

  const [allAdmissionsCount, approvedAdmissionsCount, submittedAdmissionsCount, draftAdmissionsCount] = await Promise.all([
    prisma.admission.count({ where: kpiWhere }),
    prisma.admission.count({ where: { ...kpiWhere, admissionStatus: 'Approved' } }),
    prisma.admission.count({ where: { ...kpiWhere, admissionStatus: 'Submitted' } }),
    prisma.admission.count({ where: { ...kpiWhere, admissionStatus: 'Draft' } }),
  ]);

  const kpis = {
    total: allAdmissionsCount,
    approved: approvedAdmissionsCount,
    submitted: submittedAdmissionsCount,
    draft: draftAdmissionsCount,
  };

  return (
    <div className="space-y-4 p-6">
      {/* <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ims-ink)]">Admissions operations</p>
          <p className="text-xs text-[color:var(--ims-muted)]">Use the dashboard for KPIs and the list for daily intake work.</p>
        </div>
        <Link href="/dashboards/admissions" className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--ims-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ims-ink)] transition hover:bg-[color:var(--ims-accent-soft)]">
          Open Dashboard
        </Link>
      </div> */}
      <AdmissionsClientList
        admissions={mappedAdmissions}
        branches={branches.map((b) => ({ id: b.id, name: b.branchName }))}
        courses={courses.map((c) => ({ id: c.id, name: c.nameEnglish }))}
        students={students.map((s) => ({
          id: s.id,
          label: `${s.person.firstName} ${s.person.lastName} (${s.studentNumber || 'No Student Num'})`,
        }))}
        total={total}
        currentPage={page}
        kpis={kpis}
      />
    </div>
  );
}
