import { assertPermission } from '@/lib/auth-guard';
import { Card, CardHeader, CardContent, PageHeader, ResponsiveDataTable, Badge, Button, StatCard, AdminListPageLayout, EmptyState, DataTableFilter } from '@ims/shared-ui';
import { Search, Landmark, Eye, Plus, CheckCircle2, Clock3 } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Payments & Receipts - Admin Portal | ASTI IMS' };

export default async function PaymentsListPage(props: {
  searchParams: Promise<{
    q?: string;
    method?: string;
    branchId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('payment.create');

  const query = searchParams.q || '';
  const methodFilter = searchParams.method || '';
  const branchFilter = searchParams.branchId || '';

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // Fetch branches for filter selection
  const branches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds }, isDeleted: false },
    select: { id: true, branchName: true },
  });

  // Query Payments from DB
  const payments = await prisma.payment.findMany({
    where: {
      branchId: branchFilter ? branchFilter : { in: allowedBranchIds },
      ...(methodFilter ? { paymentMethod: methodFilter as any } : {}),
      OR: query ? [
        { referenceNumber: { contains: query, mode: 'insensitive' } },
        { paymentNumber: { contains: query, mode: 'insensitive' } },
      ] : undefined
    },
    orderBy: { createdAt: 'desc' },
    include: {
      receipt: true
    }
  });

  const totals = payments.reduce(
    (acc, pay) => {
      acc.total = acc.total + Number(pay.amount);
      return acc;
    },
    { total: 0 }
  );

  const columns = [
    {
      header: 'Reference # / ID',
      render: (pay: any) => (
        <span className="font-mono font-bold text-slate-600 text-xs">
          {pay.referenceNumber || pay.id.slice(0, 8)}
        </span>
      )
    },
    {
      header: 'Payment Date',
      render: (pay: any) => <span className="text-xs text-slate-500">{new Date(pay.paymentDate).toLocaleDateString()}</span>
    },
    {
      header: 'Method',
      render: (pay: any) => <Badge variant="outline">{pay.paymentMethod}</Badge>
    },
    {
      header: 'Bank / Cheque Details',
      render: (pay: any) => (
        <span className="text-xs text-slate-600">
          {pay.bankName ? `${pay.bankName} (${pay.chequeNumber || 'Transfer'})` : 'Cash / Direct'}
        </span>
      )
    },
    {
      header: 'Amount Paid',
      render: (pay: any) => (
        <span className="font-semibold text-emerald-600 font-mono text-xs">
          {Number(pay.amount).toFixed(3)} {pay.currency}
        </span>
      )
    },
    {
      header: 'Receipt #',
      render: (pay: any) => (
        <span className="font-mono font-bold text-indigo-600 text-xs">
          {pay.receipt?.receiptNumber || 'No receipt'}
        </span>
      )
    },
    {
      header: 'Status',
      render: (pay: any) => <Badge variant={pay.status === 'Posted' ? 'success' : 'outline'}>{pay.status}</Badge>
    }
  ];

  const renderCard = (pay: any) => (
    <Card className="p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-slate-800">
          {pay.referenceNumber || pay.id.slice(0, 8)}
        </span>
        <Badge variant={pay.status === 'Posted' ? 'success' : 'outline'}>
          {pay.status}
        </Badge>
      </div>
      <div className="text-xs text-slate-500">
        Method: {pay.paymentMethod}
      </div>
      <div className="flex justify-between items-center text-xs pt-2 border-t">
        <span className="text-slate-400">Paid:</span>
        <span className="font-mono font-semibold text-emerald-600">
          {Number(pay.amount).toFixed(3)} {pay.currency}
        </span>
      </div>
    </Card>
  );

  return (
    <AdminListPageLayout>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader
          eyebrow="Finance Operations"
          title="Payments & Receipts"
          description="View, reconcile, and record manual payments against student and corporate outstanding invoices."
        />
        <Link href="/finance/payments/create">
          <Button className="h-10 gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        <StatCard
          title="Total Collected"
          value={`${totals.total.toFixed(3)} OMR`}
          description="Process payments amount sum"
          icon={<Landmark className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card className="mt-6 p-card-p">
        <DataTableFilter
          searchPlaceholder="Search payments by reference..."
          filters={[
            {
              key: 'branchId',
              label: 'Branch',
              options: branches.map(b => ({ label: b.branchName, value: b.id }))
            },
            {
              key: 'method',
              label: 'Method',
              options: [
                { label: 'Cash', value: 'Cash' },
                { label: 'Bank Transfer', value: 'BankTransfer' },
                { label: 'Cheque', value: 'Cheque' },
                { label: 'Card', value: 'Card' },
                { label: 'Online', value: 'Online' },
              ]
            }
          ]}
        />

        <div className="mt-4">
          <ResponsiveDataTable
            data={payments}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(pay: any) => pay.id}
            emptyState={
              <EmptyState
                title="No Payments Recorded"
                description="Record a new payment to associate with open invoices."
                icon={<Landmark className="h-10 w-10 text-slate-300" />}
              />
            }
          />
        </div>
      </Card>
    </AdminListPageLayout>
  );
}
