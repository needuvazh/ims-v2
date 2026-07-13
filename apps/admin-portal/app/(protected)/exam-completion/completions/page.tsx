import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { CompletionsClientList } from './_components/completions-client-list';
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

export const metadata = { title: 'Completions - Admin Portal | ASTI IMS' };

export default async function CompletionsPage(props: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    courseId?: string;
    batchId?: string;
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const session = await assertPermission('completion.view');
  const canEvaluate = session.permissions.includes('completion.evaluate');

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const courses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
  });

  const batches = await prisma.batch.findMany({
    where: { isDeleted: false },
    select: { id: true, batchNameEnglish: true, courseId: true },
  });

  const where: any = { isDeleted: false };
  if (searchParams.status) where.completionStatus = searchParams.status;

  const enrollmentFilters: any = {};
  if (searchParams.courseId) {
    enrollmentFilters.courseId = searchParams.courseId;
  }
  if (searchParams.batchId) {
    enrollmentFilters.batchId = searchParams.batchId;
  }
  if (searchParams.q) {
    enrollmentFilters.OR = [
      { enrollmentNumber: { contains: searchParams.q, mode: 'insensitive' } },
      {
        studentProfile: {
          person: {
            OR: [
              { firstName: { contains: searchParams.q, mode: 'insensitive' } },
              { lastName: { contains: searchParams.q, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  if (Object.keys(enrollmentFilters).length > 0) {
    where.enrollment = enrollmentFilters;
  }

  const [completions, total] = await Promise.all([
    prisma.courseCompletion.findMany({
      where,
      include: {
        enrollment: {
          select: {
            enrollmentNumber: true,
            studentProfile: {
              select: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
            course: { select: { nameEnglish: true } },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.courseCompletion.count({ where }),
  ]);

  const statusCounts = await prisma.courseCompletion.groupBy({
    by: ['completionStatus'],
    where: { isDeleted: false },
    _count: { completionStatus: true },
  });

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Evaluation & Training"
        title="Course Completions"
        description="Verify student metrics, manage approvals, and unlock QR-verified graduation certificates."
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Completions',
                icon: <Layers className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
        actions={
          canEvaluate && (
            <LinkButton
              href="/exam-completion/evaluate"
              variant="primary"
              className="gap-2"
            >
              Evaluate Completion
            </LinkButton>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-9 animate-fade-in-up">
        {statusCounts.map((s) => (
          <Link
            key={s.completionStatus}
            href={`/exam-completion/completions?status=${s.completionStatus}`}
          >
            <Card className="text-center transition-colors hover:border-[color:var(--ims-brass)] bg-white/50 backdrop-blur-sm">
              <CardHeader className="pb-1 p-2">
                <CardDescription
                  className="text-[9px] font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider truncate"
                  title={s.completionStatus}
                >
                  {s.completionStatus.replace('Awaiting', '')}
                </CardDescription>
                <CardTitle className="text-lg font-bold mt-0.5 text-[color:var(--ims-ink)]">
                  {s._count.completionStatus}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="animate-fade-in-up delay-100">
        <CardHeader className="pb-0">
          <CardTitle>Completion Records</CardTitle>
          <CardDescription>
            Verify student academic status, attendance metrics, and check
            certificate eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CompletionsClientList
            completions={completions.map((c) => ({
              ...c,
              attendancePercentage: c.attendancePercentage?.toNumber() ?? null,
            }))}
            courses={courses}
            batches={batches}
            total={total}
            currentPage={page}
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
