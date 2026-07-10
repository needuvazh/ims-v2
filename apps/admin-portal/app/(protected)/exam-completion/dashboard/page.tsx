import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import Link from 'next/link';
import {
  AdminListPageLayout,
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  LinkButton,
} from '@ims/shared-ui';
import {
  Calendar,
  PlayCircle,
  ClipboardList,
  GraduationCap,
  CheckSquare,
  Layers,
} from 'lucide-react';

export const metadata = {
  title: 'Exam & Completion Dashboard - Admin Portal | ASTI IMS',
};

export default async function ExamCompletionDashboard() {
  await assertPermission('exam.view');

  const [
    examsAwaitingActivation,
    openExams,
    pendingResults,
    pendingEvaluations,
    pendingApprovals,
  ] = await Promise.all([
    prisma.exam.count({ where: { status: 'Scheduled', isDeleted: false } }),
    prisma.exam.count({
      where: { status: 'OpenForResultEntry', isDeleted: false },
    }),
    prisma.result.count({
      where: { resultStatus: 'Pending', isDeleted: false },
    }),
    prisma.courseCompletion.count({
      where: { completionStatus: 'Pending', isDeleted: false },
    }),
    prisma.courseCompletion.count({
      where: {
        completionStatus: {
          in: [
            'AwaitingTrainerRecommendation',
            'AwaitingCoordinatorReview',
            'AwaitingFinalApproval',
          ],
        },
        isDeleted: false,
      },
    }),
  ]);

  const recentExams = await prisma.exam.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      course: { select: { nameEnglish: true } },
      batch: { select: { batchNameEnglish: true } },
    },
  });

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Evaluation & Training"
        title="Exam & Completion Dashboard"
        description="Overview of exam schedules, marks validation, course completions, and multi-stage academic approvals."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/exam-completion/exams?status=Scheduled">
          <StatCard
            title="Awaiting Activation"
            value={examsAwaitingActivation}
            description="Scheduled exams to be opened"
            icon={<Calendar className="h-5 w-5" />}
            tone="sky"
            className="cursor-pointer transition-all hover:scale-[1.01]"
          />
        </Link>
        <Link href="/exam-completion/exams?status=OpenForResultEntry">
          <StatCard
            title="Open for Results"
            value={openExams}
            description="Exams actively taking marks"
            icon={<PlayCircle className="h-5 w-5" />}
            tone="amber"
            className="cursor-pointer transition-all hover:scale-[1.01]"
          />
        </Link>
        <Link href="/exam-completion/exams?status=OpenForResultEntry">
          <StatCard
            title="Pending Results"
            value={pendingResults}
            description="Roster records awaiting submission"
            icon={<ClipboardList className="h-5 w-5" />}
            tone="orange"
            className="cursor-pointer transition-all hover:scale-[1.01]"
          />
        </Link>
        <Link href="/exam-completion/completions?status=Pending">
          <StatCard
            title="Pending Evaluations"
            value={pendingEvaluations}
            description="Completions ready to run rules"
            icon={<GraduationCap className="h-5 w-5" />}
            tone="violet"
            className="cursor-pointer transition-all hover:scale-[1.01]"
          />
        </Link>
        <Link href="/exam-completion/approval-queue">
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            description="Awaiting reviewer decisions"
            icon={<CheckSquare className="h-5 w-5" />}
            tone="emerald"
            className="cursor-pointer transition-all hover:scale-[1.01]"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Exams</CardTitle>
            <CardDescription>
              Latest exam schedules created for branch cohorts.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {recentExams.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">
                No exams scheduled yet.
              </p>
            ) : (
              recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50"
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-semibold text-[color:var(--ims-ink)] truncate">
                      {exam.examName}
                    </p>
                    <p className="text-xs text-[color:var(--ims-muted)] mt-0.5 truncate">
                      {exam.course.nameEnglish} • {exam.batch.batchNameEnglish}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-medium text-[color:var(--ims-muted)]">
                      {new Date(exam.examDate).toLocaleDateString()}
                    </span>
                    <LinkButton
                      href={`/exam-completion/exams/${exam.id}`}
                      variant="ghost"
                      size="sm"
                    >
                      View Detail
                    </LinkButton>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>
              Drill directly into modular lists or queue dashboards.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <LinkButton
              href="/exam-completion/exams"
              variant="outline"
              className="w-full justify-start gap-3"
            >
              <Calendar className="h-4 w-4 text-sky-600" />
              Manage Exams List
            </LinkButton>
            <LinkButton
              href="/exam-completion/completions"
              variant="outline"
              className="w-full justify-start gap-3"
            >
              <GraduationCap className="h-4 w-4 text-violet-600" />
              Course Completions
            </LinkButton>
            <LinkButton
              href="/exam-completion/approval-queue"
              variant="outline"
              className="w-full justify-start gap-3"
            >
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              Approval Queue Inbox
            </LinkButton>
            <LinkButton
              href="/exam-completion/evaluate"
              variant="outline"
              className="w-full justify-start gap-3"
            >
              <PlayCircle className="h-4 w-4 text-amber-600" />
              Run Evaluation Engine
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </AdminListPageLayout>
  );
}
