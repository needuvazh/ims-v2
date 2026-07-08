import { assertPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Landmark, PlusCircle } from 'lucide-react';
import { InvoiceForm } from '../_components/invoice-form';
import { createInvoiceAction } from '../actions';

export const metadata = { title: 'Create Invoice - Finance | ASTI IMS' };

export default async function CreateInvoicePage() {
  // Enforce create permission
  const session = await assertPermission('finance.invoice.create');

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');

  // Resolve allowed branch IDs for user
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  // Query branches
  const rawBranches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds }, isDeleted: false },
    select: { id: true, branchName: true },
  });

  const branches = rawBranches.map((b) => ({
    id: b.id,
    name: b.branchName,
  }));

  // Query students
  const rawStudents = await prisma.studentProfile.findMany({
    where: { isDeleted: false, branchId: { in: allowedBranchIds } },
    include: {
      person: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { studentNumber: 'desc' },
  });

  const students = rawStudents.map((s) => ({
    id: s.id,
    name: `${s.person.firstName} ${s.person.lastName} (${s.studentNumber})`,
    personId: s.personId,
  }));

  // Query corporate accounts
  const rawCorporates = await prisma.corporateAccount.findMany({
    where: { isDeleted: false },
    select: { id: true, accountName: true },
    orderBy: { accountName: 'asc' },
  });

  const corporateAccounts = rawCorporates.map((c) => ({
    id: c.id,
    name: c.accountName,
  }));

  // Query enrollments (converting Decimal types to regular numbers for safe JSON serialization)
  const rawEnrollments = await prisma.enrollment.findMany({
    where: {
      isDeleted: false,
      branchId: { in: allowedBranchIds },
    },
    include: {
      course: {
        select: {
          nameEnglish: true,
        },
      },
    },
    orderBy: { enrollmentNumber: 'desc' },
  });

  const enrollments = rawEnrollments.map((e) => ({
    id: e.id,
    enrollmentNumber: e.enrollmentNumber,
    studentProfileId: e.studentProfileId,
    courseId: e.courseId,
    resolvedPrice: Number(e.resolvedPrice),
    resolvedDiscount: Number(e.resolvedDiscount),
    course: e.course ? { nameEnglish: e.course.nameEnglish } : null,
  }));

  // Query courses
  const rawCourses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true, courseCode: true },
    orderBy: { nameEnglish: 'asc' },
  });

  const courses = rawCourses.map((c) => ({
    id: c.id,
    name: `${c.nameEnglish} (${c.courseCode})`,
  }));

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Create Invoice"
        description="Raise a manual student B2C fee invoice or corporate B2B training program invoice."
        backUrl="/finance/invoices"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Finance',
                href: '/finance',
                icon: <Landmark className="h-3.5 w-3.5" />,
              },
              { label: 'Invoices', href: '/finance/invoices' },
              { label: 'Create', icon: <PlusCircle className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />
      <div className="mt-4">
        <InvoiceForm
          branches={branches}
          students={students}
          corporateAccounts={corporateAccounts}
          enrollments={enrollments}
          courses={courses}
          onSubmitAction={createInvoiceAction}
        />
      </div>
    </AdminFormPageLayout>
  );
}
