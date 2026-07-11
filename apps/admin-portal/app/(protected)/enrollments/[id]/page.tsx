import { notFound } from 'next/navigation';
import { assertPermission } from '@/lib/auth-guard';
import { prisma } from '@ims/database';
import { EnrollmentDetailsClient } from './_components/enrollment-details-client';

export const metadata = { title: 'Enrollment Console Details | ASTI IMS' };

export default async function EnrollmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: enrollmentId } = await props.params;

  // Enforce read permission
  const session = await assertPermission('enrollment.read');

  const { branchScopeResolver } = await import('@/lib/runtime');

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId, isDeleted: false },
    include: {
      studentProfile: {
        include: {
          person: true,
        },
      },
      course: true,
      batch: true,
      branch: true,
      walkInEnrollment: true,
    },
  });

  if (!enrollment) {
    notFound();
  }

  // Verify branch assignment scope
  if (!allowedBranchIds.includes(enrollment.branchId as any)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="rounded-full bg-rose-50 p-3 text-rose-600 mb-4 border border-rose-100">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-slate-600 max-w-md">
          You do not have permission to view this enrollment record because it
          belongs to another branch.
        </p>
      </div>
    );
  }

  // Fetch audit history logs for this enrollment
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityId: enrollmentId,
      entityType: 'Enrollment',
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch branches
  const rawBranches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds }, isDeleted: false },
    select: { id: true, branchName: true },
  });
  const branches = rawBranches.map((b) => ({ id: b.id, name: b.branchName }));

  // Fetch courses
  const rawCourses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true, nameEnglish: true },
  });
  const courses = rawCourses.map((c) => ({ id: c.id, name: c.nameEnglish }));

  // Fetch course batches in the enrollment's branch
  const rawBatches = await prisma.batch.findMany({
    where: {
      courseId: enrollment.courseId,
      branchId: enrollment.branchId,
      isDeleted: false,
    },
    select: {
      id: true,
      batchCode: true,
      capacity: true,
      currentEnrollmentCount: true,
      waitingListEnabled: true,
    },
  });
  const courseBatches = rawBatches.map((b) => ({
    id: b.id,
    batchCode: b.batchCode,
    capacity: b.capacity,
    currentEnrollmentCount: b.currentEnrollmentCount,
    waitingListEnabled: b.waitingListEnabled,
  }));

  // Fetch invoices for this enrollment
  const invoices = await prisma.invoice.findMany({
    where: { enrollmentId, isDeleted: false },
    include: {
      lineItems: true,
      payments: {
        where: { isDeleted: false },
      },
      installmentPlans: {
        where: { isDeleted: false },
        include: {
          installments: {
            where: { isDeleted: false },
            orderBy: { sequenceNumber: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const serializedInvoices = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    subCategory: inv.subCategory,
    invoiceDate: inv.invoiceDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    outstandingAmount: Number(inv.outstandingAmount),
    lineItems: inv.lineItems.map((li) => ({
      id: li.id,
      descriptionEnglish: li.descriptionEnglish,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      discountAmount: Number(li.discountAmount),
      taxRate: Number(li.taxRate),
      taxAmount: Number(li.taxAmount),
      lineTotal: Number(li.lineTotal),
    })),
    payments: inv.payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate.toISOString(),
      referenceNumber: p.referenceNumber || '',
      remarks: p.remarks || '',
    })),
    installmentPlans: inv.installmentPlans.map((plan) => ({
      id: plan.id,
      planName: plan.planName,
      status: plan.status,
      numberOfInstallments: plan.numberOfInstallments,
      totalAmount: Number(plan.totalAmount),
      installments: plan.installments.map((inst) => ({
        id: inst.id,
        sequenceNumber: inst.sequenceNumber,
        dueDate: inst.dueDate.toISOString(),
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
        status: inst.status,
      })),
    })),
  }));

  // Map values for client component
  const mappedDetail = {
    enrollment: {
      id: enrollment.id,
      enrollmentNumber: enrollment.enrollmentNumber,
      enrollmentStatus: enrollment.enrollmentStatus,
      createdAt: enrollment.createdAt.toISOString(),
      branchName: enrollment.branch.branchName,
      branchId: enrollment.branchId,
      courseId: enrollment.courseId,
      courseName: enrollment.course.nameEnglish,
      batchId: enrollment.batchId || null,
      batchCode: enrollment.batch?.batchCode || 'Course Waitlist (No Batch)',
      studentName: `${enrollment.studentProfile.person.firstName} ${enrollment.studentProfile.person.lastName}`,
      studentEmail: enrollment.studentProfile.person.email || 'N/A',
      studentMobile: enrollment.studentProfile.person.mobile || 'N/A',
      pricingSource: enrollment.pricingSource,
      resolvedPrice: enrollment.resolvedPrice.toString(),
      resolvedDiscount: enrollment.resolvedDiscount.toString(),
      finalAmount: enrollment.finalAmount.toString(),
      paymentValidationRequired: enrollment.paymentValidationRequired,
      priceEvaluationTimestamp:
        enrollment.priceEvaluationTimestamp?.toISOString() || null,
      paymentCollected:
        enrollment.walkInEnrollment?.paymentCollected?.toString() || '0.00',
      enrollmentType: enrollment.enrollmentType,
      studentProfileId: enrollment.studentProfileId,
      photoUrl: enrollment.studentProfile.person.photoUrl || null,
    },
    history: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      performedBy: log.performedBy || 'System',
      performedAt: log.createdAt.toISOString(),
      remarks: log.reason || '-',
    })),
  };

  return (
    <div className="p-6">
      <EnrollmentDetailsClient
        detail={mappedDetail}
        sessionUserId={session.userId}
        sessionPermissions={session.permissions}
        invoices={serializedInvoices}
        branches={branches}
        courses={courses}
        batches={courseBatches}
      />
    </div>
  );
}
