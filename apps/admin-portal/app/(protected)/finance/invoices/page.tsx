import { assertPermission } from '@/lib/auth-guard';
import {
  Card,
  CardHeader,
  CardContent,
  PageHeader,
  ResponsiveDataTable,
  Badge,
  Button,
  StatCard,
  AdminListPageLayout,
  EmptyState,
  DataTableFilter,
} from '@ims/shared-ui';
import {
  Search,
  FileText,
  Eye,
  Plus,
  CheckCircle2,
  Clock3,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { InvoiceActionsClient } from './_components/invoice-actions-client';

export const metadata = {
  title: 'Invoices & Billings - Admin Portal | ASTI IMS',
};

export default async function InvoicesListPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('dashboard.finance');

  const query = searchParams.q || '';
  const statusFilter = searchParams.status || '';
  const branchFilter = searchParams.branchId || '';

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  // Fetch branches for filter selection
  const branches = await prisma.branch.findMany({
    where: { id: { in: allowedBranchIds }, isDeleted: false },
    select: { id: true, branchName: true },
  });

  // Query Invoices from DB
  const invoices = await prisma.invoice.findMany({
    where: {
      branchId: branchFilter ? branchFilter : { in: allowedBranchIds },
      ...(statusFilter ? { status: statusFilter as any } : {}),
      OR: query
        ? [{ invoiceNumber: { contains: query, mode: 'insensitive' } }]
        : undefined,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      studentProfile: {
        include: {
          person: true,
        },
      },
      corporateAccount: true,
      refunds: {
        where: { isDeleted: false, status: { in: ['Approved', 'Executed'] } },
        select: { id: true, amount: true, status: true },
      },
    },
  });

  // Serialize Prisma objects -> plain objects to prevent Next.js Client Component errors
  const serializedInvoices = JSON.parse(JSON.stringify(invoices)).map(
    (inv: any) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      outstandingAmount: Number(inv.outstandingAmount),
      refunds: (inv.refunds || []).map((r: any) => ({
        ...r,
        amount: Number(r.amount),
      })),
    }),
  );

  const totals = serializedInvoices.reduce(
    (acc: any, inv: any) => {
      acc.total = acc.total + inv.totalAmount;
      acc.outstanding = acc.outstanding + inv.outstandingAmount;
      acc.paid = acc.paid + inv.paidAmount;
      return acc;
    },
    { total: 0, outstanding: 0, paid: 0 },
  );

  const columns = [
    {
      header: 'Invoice #',
      render: (inv: any) => (
        <span className="font-mono font-bold text-slate-600 text-xs">
          {inv.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Payer',
      render: (inv: any) => {
        if (inv.studentProfile) {
          const p = inv.studentProfile.person;
          return (
            <span className="font-semibold text-slate-800">
              {p.firstName} {p.lastName}
            </span>
          );
        }
        if (inv.corporateAccount) {
          return (
            <span className="font-semibold text-slate-800">
              {inv.corporateAccount.accountName}
            </span>
          );
        }
        return <span className="text-slate-400">N/A</span>;
      },
    },
    {
      header: 'Invoice Date',
      render: (inv: any) => (
        <span className="text-xs text-slate-500">
          {new Date(inv.invoiceDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Due Date',
      render: (inv: any) => (
        <span className="text-xs text-slate-500">
          {new Date(inv.dueDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Total Amount',
      render: (inv: any) => (
        <span className="font-semibold text-slate-900 font-mono text-xs">
          {Number(inv.totalAmount).toFixed(3)} {inv.currency}
        </span>
      ),
    },
    {
      header: 'Outstanding',
      render: (inv: any) => {
        const refundedAmt = (inv.refunds || []).reduce(
          (s: number, r: any) => s + Number(r.amount),
          0,
        );
        const hasRefund = refundedAmt > 0;
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`font-semibold font-mono text-xs ${hasRefund ? 'text-orange-600' : 'text-rose-600'}`}
            >
              {Number(inv.outstandingAmount).toFixed(3)} {inv.currency}
            </span>
            {hasRefund && (
              <span className="text-xs text-orange-500 flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> {refundedAmt.toFixed(3)}{' '}
                refunded
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      render: (inv: any) => {
        const hasRefund = (inv.refunds || []).length > 0;
        let variant: 'success' | 'warning' | 'error' | 'info' | 'outline' =
          'outline';
        if (inv.status === 'Paid') variant = 'success';
        if (inv.status === 'PartiallyPaid') variant = 'warning';
        if (inv.status === 'Overdue') variant = 'error';
        if (inv.status === 'Issued') variant = 'info';
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={variant}>{inv.status}</Badge>
            {hasRefund && (
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-200 bg-orange-50 gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Refunded
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      render: (inv: any) => <InvoiceActionsClient invoice={inv} />,
    },
  ];

  const renderCard = (invoice: any) => (
    <Card className="p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-slate-800">
          {invoice.invoiceNumber}
        </span>
        <Badge
          variant={
            invoice.status === 'Paid'
              ? 'success'
              : invoice.status === 'PartiallyPaid'
                ? 'warning'
                : invoice.status === 'Overdue'
                  ? 'error'
                  : 'outline'
          }
        >
          {invoice.status}
        </Badge>
      </div>
      <div className="text-xs text-slate-500">
        {invoice.payerType === 'Student'
          ? `${invoice.studentProfile?.person.firstName} ${invoice.studentProfile?.person.lastName}`
          : invoice.corporateAccount?.accountName}
      </div>
      <div className="flex justify-between items-center text-xs pt-2 border-t">
        <span className="text-slate-400">Total:</span>
        <span className="font-mono font-semibold text-slate-700">
          {Number(invoice.totalAmount).toFixed(3)} {invoice.currency}
        </span>
      </div>
    </Card>
  );

  const canCreate = session.permissions.includes('finance.invoice.create');

  return (
    <AdminListPageLayout>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader
          eyebrow="Finance & Billings"
          title="Invoice Management"
          description="View details, print invoices, track outstanding payments, and issue balance receipts."
        />
        {canCreate && (
          <Link href="/finance/invoices/create" className="shrink-0">
            <Button className="h-10 gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Create Invoice
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        <StatCard
          title="Total Raised"
          value={`${totals.total.toFixed(3)} OMR`}
          description="Billed invoice balance"
          icon={<FileText className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          title="Total Settled"
          value={`${totals.paid.toFixed(3)} OMR`}
          description="Collected payments"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Active Outstanding"
          value={`${totals.outstanding.toFixed(3)} OMR`}
          description="Receivables outstanding"
          icon={<Clock3 className="h-5 w-5 text-rose-600" />}
        />
      </div>

      <Card className="mt-6 p-card-p">
        <DataTableFilter
          searchPlaceholder="Search invoices by number..."
          filters={[
            {
              key: 'branchId',
              label: 'Branch',
              options: branches.map((b) => ({
                label: b.branchName,
                value: b.id,
              })),
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'Draft' },
                { label: 'Issued', value: 'Issued' },
                { label: 'Paid', value: 'Paid' },
                { label: 'Partially Paid', value: 'PartiallyPaid' },
                { label: 'Overdue', value: 'Overdue' },
                { label: 'Cancelled', value: 'Cancelled' },
              ],
            },
          ]}
        />

        <div className="mt-4">
          <ResponsiveDataTable
            data={serializedInvoices}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(invoice: any) => invoice.id}
            emptyState={
              <EmptyState
                title="No Invoices Found"
                description="Try refining your query or create a new invoice to get started."
                icon={<FileText className="h-10 w-10 text-slate-300" />}
              />
            }
          />
        </div>
      </Card>
    </AdminListPageLayout>
  );
}
