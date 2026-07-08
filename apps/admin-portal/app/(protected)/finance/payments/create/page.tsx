import { assertPermission } from '@/lib/auth-guard';
import { AdminListPageLayout, PageHeader } from '@ims/shared-ui';
import { PaymentForm } from '../_components/payment-form';

export const metadata = { title: 'Record Payment - Admin Portal | ASTI IMS' };

export default async function RecordPaymentPage() {
  const session = await assertPermission('payment.create');

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  const rawInvoices = await prisma.invoice.findMany({
    where: {
      branchId: { in: allowedBranchIds },
      status: { in: ['Issued', 'PartiallyPaid'] },
      isDeleted: false,
    },
    include: {
      studentProfile: {
        include: {
          person: true,
        },
      },
      corporateAccount: true,
    },
    orderBy: { invoiceNumber: 'desc' },
  });

  const invoices = rawInvoices
    .map((inv) => {
      let payerName = 'Unknown Customer';
      if (inv.studentProfile?.person) {
        payerName = `${inv.studentProfile.person.firstName} ${inv.studentProfile.person.lastName}`;
      } else if (inv.corporateAccount) {
        payerName = inv.corporateAccount.accountName;
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        branchId: inv.branchId,
        totalAmount: Number(inv.totalAmount),
        outstandingAmount: Number(inv.outstandingAmount),
        payerName,
      };
    })
    .filter((inv) => inv.outstandingAmount > 0);

  return (
    <AdminListPageLayout>
      <PageHeader
        eyebrow="Finance Operations"
        title="Record Client Payment"
        description="Receive payment and issue an official receipt for student B2C fees or corporate B2B balances."
        backUrl="/finance/payments"
      />

      <div className="mt-6">
        <PaymentForm invoices={invoices} />
      </div>
    </AdminListPageLayout>
  );
}
