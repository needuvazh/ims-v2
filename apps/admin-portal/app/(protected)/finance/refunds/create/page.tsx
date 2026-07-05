import { assertPermission } from '@/lib/auth-guard';
import { AdminListPageLayout, PageHeader } from '@ims/shared-ui';
import { RefundForm } from '../_components/refund-form';

export const metadata = { title: 'Request Refund - Admin Portal | ASTI IMS' };

export default async function RequestRefundPage() {
  const session = await assertPermission('refund.request');

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  const rawPayments = await prisma.payment.findMany({
    where: {
      branchId: { in: allowedBranchIds },
      status: { in: ['Posted', 'PartiallyRefunded'] },
      isDeleted: false
    },
    include: {
      studentProfile: {
        include: {
          person: true
        }
      },
      corporateAccount: true,
      refunds: {
        where: { isDeleted: false, status: { not: 'Rejected' } }
      }
    },
    orderBy: { paymentDate: 'desc' }
  });

  const payments = rawPayments.map((p) => {
    const totalRefunded = p.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const available = Number(p.amount) - totalRefunded;

    let payerName = 'Unknown Payer';
    if (p.studentProfile?.person) {
      payerName = `${p.studentProfile.person.firstName} ${p.studentProfile.person.lastName}`;
    } else if (p.corporateAccount) {
      payerName = p.corporateAccount.accountName;
    }

    return {
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceId: p.invoiceId,
      branchId: p.branchId,
      paidAmount: Number(p.amount),
      alreadyRefunded: totalRefunded,
      availableAmount: available,
      payerName
    };
  }).filter(p => p.availableAmount > 0);

  return (
    <AdminListPageLayout>
      <PageHeader
        eyebrow="Finance Operations"
        title="Request Payment Refund"
        description="Initiate a refund or transaction reversal request for an active payment."
        backUrl="/finance/refunds"
      />

      <div className="mt-6">
        <RefundForm payments={payments} />
      </div>
    </AdminListPageLayout>
  );
}
