import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { ExamsClientList } from './_components/exams-client-list';
import {
  AdminListPageLayout,
  PageHeader,
  LinkButton,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  Breadcrumbs,
} from '@ims/shared-ui';
import Link from 'next/link';
import { Home, Layers } from 'lucide-react';

export const metadata = { title: 'Exams - Admin Portal | ASTI IMS' };

export default async function ExamsPage(props: {
  searchParams: Promise<{
    batchId?: string;
    courseId?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const session = await assertPermission('exam.view');

  const isSuperAdmin =
    session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');

  let branches;
  if (isSuperAdmin) {
    branches = await prisma.branch.findMany({
      where: { isDeleted: false },
      select: { id: true, branchName: true },
    });
  } else {
    const access = await prisma.userBranchAccess.findMany({
      where: { userId: session.userId, status: 'Active' },
      include: { branch: true },
    });
    branches = access.map((a) => ({
      id: a.branch.id,
      branchName: a.branch.branchName,
    }));
  }

  let finalBranchId: string | undefined;
  if (!isSuperAdmin) {
    const allowedBranchIds = branches.map((b) => b.id);
    finalBranchId =
      session.activeBranchId &&
      allowedBranchIds.includes(session.activeBranchId)
        ? session.activeBranchId
        : allowedBranchIds[0] || 'none';
  }

  const courses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
  });

  const batches = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      ...(finalBranchId && finalBranchId !== 'none'
        ? { branchId: finalBranchId }
        : {}),
    },
    select: { id: true, batchNameEnglish: true, courseId: true },
  });

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const where: any = { isDeleted: false };

  if (searchParams.q) {
    where.examName = { contains: searchParams.q, mode: 'insensitive' };
  }
  if (searchParams.batchId) {
    where.batchId = searchParams.batchId;
  } else if (searchParams.courseId) {
    const batchIds = batches
      .filter((b) => b.courseId === searchParams.courseId)
      .map((b) => b.id);
    where.batchId = { in: batchIds };
  }
  if (searchParams.status) {
    where.status = searchParams.status;
  }

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      orderBy: { examDate: 'desc' },
      skip,
      take: limit,
      include: {
        course: { select: { nameEnglish: true } },
        batch: { select: { batchNameEnglish: true } },
      },
    }),
    prisma.exam.count({ where }),
  ]);

  const statusCounts = await prisma.exam.groupBy({
    by: ['status'],
    where: { isDeleted: false },
    _count: { status: true },
  });

  const hasCreatePermission =
    session.permissions.includes('exam.create') ||
    session.roles.includes('SUPER_ADMIN');

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Evaluation & Training"
        title="Exams"
        description="Manage exam schedules, record results, and track completion."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              { label: 'Exams', icon: <Layers className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          hasCreatePermission && (
            <LinkButton
              href="/exam-completion/exams/new"
              variant="primary"
              className="gap-2"
            >
              Create Exam
            </LinkButton>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-fade-in-up">
        {statusCounts.map((s) => (
          <Link
            key={s.status}
            href={`/exam-completion/exams?status=${s.status}`}
          >
            <Card className="text-center transition-colors hover:border-[color:var(--ims-brass)] bg-white/50 backdrop-blur-sm">
              <CardHeader className="pb-2 p-4">
                <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                  {s.status}
                </CardDescription>
                <CardTitle className="text-2xl font-bold mt-1 text-[color:var(--ims-ink)]">
                  {s._count.status}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="animate-fade-in-up delay-100">
        <CardHeader className="pb-0">
          <CardTitle>Exam Schedules</CardTitle>
          <CardDescription>
            View, activate, and manage results for registered exams.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ExamsClientList
            exams={exams.map((e) => ({
              ...e,
              examDate: e.examDate.toISOString(),
              maxMarks: e.maxMarks.toNumber(),
              passMarks: e.passMarks.toNumber(),
            }))}
            courses={courses}
            batches={batches}
            total={total}
            currentPage={page}
            permissions={session.permissions}
            defaultSearch={searchParams.q || ''}
            defaultCourseId={searchParams.courseId || ''}
            defaultBatchId={searchParams.batchId || ''}
            defaultStatus={searchParams.status || ''}
          />
        </CardContent>
      </Card>
    </AdminListPageLayout>
  );
}
