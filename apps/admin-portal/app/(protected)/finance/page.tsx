import { assertPermission } from '@/lib/auth-guard';
import { Card, CardHeader, CardContent, StatCard, PageHeader, ResponsiveDataTable, Badge, Button, AdminListPageLayout, EmptyState } from '@ims/shared-ui';
import { CreditCard, FileText, Plus, Landmark, ArrowUpRight, ArrowDownRight, RefreshCcw, Landmark as BankIcon, Users, CheckCircle2, Clock3 } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Finance Dashboard - Admin Portal | ASTI IMS' };

export default async function FinanceDashboardPage() {
  const session = await assertPermission('dashboard.finance');

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // Fetch metrics from DB
  const invoices = await prisma.invoice.findMany({
    where: { branchId: { in: allowedBranchIds } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      studentProfile: {
        include: {
          person: true
        }
      },
      corporateAccount: true
    }
  });

  const allInvoices = await prisma.invoice.findMany({
    where: { branchId: { in: allowedBranchIds } }
  });

  const totals = allInvoices.reduce(
    (acc, inv) => {
      acc.total = acc.total + Number(inv.totalAmount);
      acc.outstanding = acc.outstanding + Number(inv.outstandingAmount);
      acc.paid = acc.paid + Number(inv.paidAmount);
      return acc;
    },
    { total: 0, outstanding: 0, paid: 0 }
  );

  const overdueCount = allInvoices.filter(inv => inv.status === 'Overdue').length;
  const unpaidCount = allInvoices.filter(inv => ['Issued', 'PartiallyPaid'].includes(inv.status)).length;

  const columns = [
    {
      header: 'Invoice #',
      render: (inv: any) => (
        <span className="font-mono font-bold text-slate-600 text-xs">
          {inv.invoiceNumber}
        </span>
      )
    },
    {
      header: 'Payer',
      render: (inv: any) => {
        if (inv.studentProfile) {
          const p = inv.studentProfile.person;
          return <span className="font-semibold text-slate-800">{p.firstName} {p.lastName} (Student)</span>;
        }
        if (inv.corporateAccount) {
          return <span className="font-semibold text-slate-800">{inv.corporateAccount.accountName} (Corporate)</span>;
        }
        return <span className="text-slate-400">N/A</span>;
      }
    },
    {
      header: 'Invoice Date',
      render: (inv: any) => <span className="text-xs text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</span>
    },
    {
      header: 'Due Date',
      render: (inv: any) => <span className="text-xs text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</span>
    },
    {
      header: 'Total Amount',
      render: (inv: any) => (
        <span className="font-semibold text-slate-900 font-mono text-xs">
          {Number(inv.totalAmount).toFixed(3)} {inv.currency}
        </span>
      )
    },
    {
      header: 'Outstanding',
      render: (inv: any) => (
        <span className="font-semibold text-rose-600 font-mono text-xs">
          {Number(inv.outstandingAmount).toFixed(3)} {inv.currency}
        </span>
      )
    },
    {
      header: 'Status',
      render: (inv: any) => {
        let variant: 'success' | 'warning' | 'error' | 'info' | 'outline' = 'outline';
        if (inv.status === 'Paid') variant = 'success';
        if (inv.status === 'PartiallyPaid') variant = 'warning';
        if (inv.status === 'Overdue') variant = 'error';
        if (inv.status === 'Issued') variant = 'info';
        return <Badge variant={variant}>{inv.status}</Badge>;
      }
    }
  ];

  const renderCard = (invoice: any) => (
    <Card className="p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</span>
        <Badge variant={invoice.status === 'Paid' ? 'success' : invoice.status === 'PartiallyPaid' ? 'warning' : invoice.status === 'Overdue' ? 'error' : 'outline'}>
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
          {Number(invoice.totalAmount).toFixed(3)} OMR
        </span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance Operations"
        title="Finance & Receivables Dashboard"
        description="Monitor billings, installments, outstanding receivables, and payments across your assigned branches."
        actions={
          <div className="flex gap-3">
            <Button variant="outline" className="h-10 gap-2">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
            <Link href="/finance/invoices">
              <Button className="h-10 gap-2">
                <Plus className="h-4 w-4" /> Manage Invoices
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Billed"
          value={`${totals.total.toFixed(3)} OMR`}
          description="Operational billings sum"
          icon={<FileText className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          title="Total Collected"
          value={`${totals.paid.toFixed(3)} OMR`}
          description="Received payments"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Total Outstanding"
          value={`${totals.outstanding.toFixed(3)} OMR`}
          description="Unpaid invoice balance"
          icon={<Clock3 className="h-5 w-5 text-rose-600" />}
        />
        <StatCard
          title="Active Students Unpaid"
          value={unpaidCount.toString()}
          description="Unpaid active students"
          icon={<Users className="h-5 w-5 text-amber-600" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-card-p">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[color:var(--ims-ink)]">
                Recent Invoices
              </h3>
              <p className="text-xs text-[color:var(--ims-muted)]">
                The latest invoices generated for student and corporate courses.
              </p>
            </div>
            <Link href="/finance/invoices">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {invoices.length > 0 ? (
              <ResponsiveDataTable
                data={invoices}
                columns={columns}
                renderCard={renderCard}
                keyExtractor={(invoice: any) => invoice.id}
              />
            ) : (
              <div className="p-8">
                <EmptyState
                  title="No Invoices Registered"
                  description="There are currently no invoices raised for this branch. When admissions are processed, invoices will appear here."
                  icon={<FileText className="h-10 w-10 text-slate-300" />}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[color:var(--ims-ink)]">
              Quick Actions
            </h3>
            <p className="text-xs text-[color:var(--ims-muted)]">
              Shortcuts to billing operations.
            </p>
          </CardHeader>
          <CardContent className="p-card-p space-y-3">
            <Link href="/finance/invoices/create" className="block w-full">
              <Button variant="outline" className="w-full justify-start h-11 gap-3">
                <Plus className="h-4 w-4 text-indigo-500" /> Create Student Invoice
              </Button>
            </Link>
            <Link href="/finance/payments" className="block w-full">
              <Button variant="outline" className="w-full justify-start h-11 gap-3">
                <Landmark className="h-4 w-4 text-emerald-500" /> Record Client Payment
              </Button>
            </Link>
            <Link href="/finance/refunds" className="block w-full">
              <Button variant="outline" className="w-full justify-start h-11 gap-3">
                <ArrowDownRight className="h-4 w-4 text-rose-500" /> Request Refund Reversal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
