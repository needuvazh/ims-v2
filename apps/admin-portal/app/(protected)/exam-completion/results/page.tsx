import { prisma } from '@ims/database';
import { assertPermission } from '@/lib/auth-guard';
import { ResultsClientList } from './_components/results-client-list';
import {
  AdminListPageLayout,
  PageHeader,
  LinkButton,
  Breadcrumbs,
} from '@ims/shared-ui';
import Link from 'next/link';
import { Home, Layers, Calendar, ClipboardList } from 'lucide-react';

export const metadata = { title: 'Results - Admin Portal | ASTI IMS' };

export default async function ResultsPage(props: {
  searchParams: Promise<{ examId?: string; status?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('result.view');
  const isSuperAdmin =
    session.roles.includes('SUPER_ADMIN') || session.roles.includes('OWNER');

  const { examId, status, page: pageStr } = searchParams;
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  let examDetails: any = null;
  let rosterResults: any[] = [];
  let totalCount = 0;

  if (examId) {
    // 1. Fetch Exam and Batch details
    examDetails = await prisma.exam.findUnique({
      where: { id: examId, isDeleted: false },
      include: {
        course: { select: { nameEnglish: true } },
        batch: { select: { batchNameEnglish: true, branchId: true } },
      },
    });

    if (examDetails) {
      // 2. Fetch Enrollments in the Batch
      const enrollments = await prisma.enrollment.findMany({
        where: { batchId: examDetails.batchId, isDeleted: false },
        include: {
          studentProfile: {
            include: {
              person: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      // 3. Fetch existing Results for the Exam
      const existingResults = await prisma.result.findMany({
        where: { examId, isDeleted: false },
      });

      // 4. Merge Enrollments with Results (creating transient placeholders for students without results)
      rosterResults = enrollments.map((enr) => {
        const existing = existingResults.find((r) => r.enrollmentId === enr.id);
        return {
          id: existing?.id || `temp-${enr.id}`,
          enrollmentId: enr.id,
          examId,
          marksObtained: existing ? existing.marksObtained.toNumber() : 0,
          grade: existing?.grade || '',
          resultStatus: existing?.resultStatus || 'Pending',
          enrollment: {
            enrollmentNumber: enr.enrollmentNumber,
            studentProfile: {
              person: {
                firstName: enr.studentProfile?.person?.firstName || 'Unknown',
                lastName: enr.studentProfile?.person?.lastName || 'Student',
              },
            },
          },
          exam: {
            examName: examDetails.examName,
            maxMarks: examDetails.maxMarks.toNumber(),
            passMarks: examDetails.passMarks.toNumber(),
            status: examDetails.status,
          },
        };
      });

      totalCount = rosterResults.length;
      rosterResults = rosterResults.slice(skip, skip + limit);
    }
  } else {
    // Standard paginated listing of all recorded results
    const where: any = { isDeleted: false };
    if (status) where.resultStatus = status;

    const [dbResults, count] = await Promise.all([
      prisma.result.findMany({
        where,
        include: {
          exam: {
            select: {
              examName: true,
              maxMarks: true,
              passMarks: true,
              status: true,
            },
          },
          enrollment: {
            select: {
              enrollmentNumber: true,
              studentProfile: {
                select: {
                  person: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.result.count({ where }),
    ]);

    rosterResults = dbResults.map((r) => ({
      id: r.id,
      enrollmentId: r.enrollmentId,
      examId: r.examId,
      marksObtained: r.marksObtained.toNumber(),
      grade: r.grade || '',
      resultStatus: r.resultStatus,
      enrollment: r.enrollment,
      exam: {
        examName: r.exam.examName,
        maxMarks: r.exam.maxMarks.toNumber(),
        passMarks: r.exam.passMarks.toNumber(),
        status: r.exam.status,
      },
    }));

    totalCount = count;
  }

  const userPermissions = session.permissions;

  return (
    <AdminListPageLayout className="pt-1 sm:pt-0">
      <PageHeader
        eyebrow="Evaluation & Training"
        title={
          examDetails ? `Results: ${examDetails.examName}` : 'Exam Results'
        }
        description={
          examDetails
            ? `${examDetails.course.nameEnglish} • ${examDetails.batch.batchNameEnglish}`
            : 'Record and validate exam marks rosters across branch cohorts.'
        }
        backUrl={
          examDetails ? `/exam-completion/exams/${examDetails.id}` : undefined
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Exams',
                href: '/exam-completion/exams',
                icon: <Layers className="h-3.5 w-3.5" />,
              },
              ...(examDetails
                ? [
                    {
                      label: examDetails.examName,
                      href: `/exam-completion/exams/${examDetails.id}`,
                      icon: <Calendar className="h-3.5 w-3.5" />,
                    },
                  ]
                : []),
              {
                label: 'Results',
                icon: <ClipboardList className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
        actions={
          examDetails && (
            <LinkButton
              href={`/exam-completion/exams/${examDetails.id}`}
              variant="outline"
            >
              Back to Exam
            </LinkButton>
          )
        }
      />

      <ResultsClientList
        results={rosterResults}
        exam={
          examDetails
            ? {
                id: examDetails.id,
                maxMarks: examDetails.maxMarks.toNumber(),
                passMarks: examDetails.passMarks.toNumber(),
                status: examDetails.status,
              }
            : null
        }
        permissions={userPermissions}
      />

      {totalCount > limit && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(totalCount / limit) }, (_, i) => (
            <Link
              key={i}
              href={`/exam-completion/results?${examId ? `examId=${examId}&` : ''}${status ? `status=${status}&` : ''}page=${i + 1}`}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition-all ${
                i + 1 === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </AdminListPageLayout>
  );
}
