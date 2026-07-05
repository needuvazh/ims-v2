import { assertPermission } from '@/lib/auth-guard';
import { Card, CardHeader, CardContent, PageHeader, ResponsiveDataTable, Badge, Button, EmptyState } from '@ims/shared-ui';
import { Plus, Landmark, ArrowDownRight, FileText, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { FinanceDashboardClient } from './_components/finance-dashboard-client';

export const metadata = { title: 'Finance Dashboard - Admin Portal | ASTI IMS' };

export default async function FinanceDashboardPage() {
  const session = await assertPermission('dashboard.finance');

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  // 1. Fetch Invoices from DB
  const invoices = await prisma.invoice.findMany({
    where: { branchId: { in: allowedBranchIds }, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      studentProfile: {
        include: {
          person: true
        }
      },
      corporateAccount: true
    }
  });

  const serializedInvoices = JSON.parse(JSON.stringify(invoices));

  const allInvoices = await prisma.invoice.findMany({
    where: { branchId: { in: allowedBranchIds }, isDeleted: false },
    include: {
      corporateAccount: true
    }
  });

  // 2. Dates setup
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // 3. KPI Calculations
  const nonDraftInvoices = allInvoices.filter(inv => inv.status !== 'Draft');
  
  const totalInvoiced = nonDraftInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const revenueCollected = nonDraftInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);

  // Fetch executed/approved refunds — money actually returned to payers
  const executedRefunds = await prisma.refund.findMany({
    where: {
      branchId: { in: allowedBranchIds },
      status: { in: ['Executed', 'Approved'] },
      isDeleted: false
    },
    select: { amount: true }
  });
  const totalRefunded = executedRefunds.reduce((sum, r) => sum + Number(r.amount), 0);

  // Outstanding receivables must NOT include money already refunded
  const rawOutstanding = nonDraftInvoices.reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0);
  const outstandingReceivables = Math.max(0, rawOutstanding - totalRefunded);
  const collectionRate = totalInvoiced > 0 ? (revenueCollected / totalInvoiced) * 100 : 0;

  const corporateRevenue = nonDraftInvoices
    .filter(inv => inv.category === 'Corporate')
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const studentRevenue = nonDraftInvoices
    .filter(inv => inv.category === 'Student')
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  // Installments due this month
  const rawInstallments = await prisma.installment.findMany({
    where: {
      dueDate: {
        gte: startOfThisMonth,
        lte: endOfThisMonth
      },
      status: { not: 'Paid' },
      installmentPlan: {
        invoice: {
          branchId: { in: allowedBranchIds },
          isDeleted: false
        }
      }
    }
  });
  const installmentsDueThisMonth = rawInstallments.reduce((sum, inst) => sum + Number(inst.amount) - Number(inst.paidAmount), 0);

  // MoM growth
  const thisMonthInvoiced = nonDraftInvoices
    .filter(inv => inv.invoiceDate >= startOfThisMonth && inv.invoiceDate <= endOfThisMonth)
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const lastMonthInvoiced = nonDraftInvoices
    .filter(inv => inv.invoiceDate >= startOfLastMonth && inv.invoiceDate <= endOfLastMonth)
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  const revenueGrowth = lastMonthInvoiced > 0 
    ? ((thisMonthInvoiced - lastMonthInvoiced) / lastMonthInvoiced) * 100 
    : 0;

  const kpis = {
    revenueCollected,
    totalInvoiced,
    outstandingReceivables,
    collectionRate,
    corporateRevenue,
    studentRevenue,
    installmentsDueThisMonth,
    revenueGrowth,
    totalRefunded
  };

  // 4. MoM and YoY comparative data calculations
  const monthsList = [
    { label: 'Jan', index: 0 },
    { label: 'Feb', index: 1 },
    { label: 'Mar', index: 2 },
    { label: 'Apr', index: 3 },
    { label: 'May', index: 4 },
    { label: 'Jun', index: 5 },
    { label: 'Jul', index: 6 },
    { label: 'Aug', index: 7 },
    { label: 'Sep', index: 8 },
    { label: 'Oct', index: 9 },
    { label: 'Nov', index: 10 },
    { label: 'Dec', index: 11 },
  ];

  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const yearOverYearData = monthsList.map(m => {
    const currentYearVal = nonDraftInvoices
      .filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d.getFullYear() === currentYear && d.getMonth() === m.index;
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const previousYearVal = nonDraftInvoices
      .filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d.getFullYear() === previousYear && d.getMonth() === m.index;
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return {
      month: m.label,
      currentYear: Number(currentYearVal.toFixed(2)),
      previousYear: Number(previousYearVal.toFixed(2))
    };
  });

  const currentMonthIndex = now.getMonth();
  const currentMonthYear = now.getFullYear();

  const prevMonthDate = new Date(currentMonthYear, currentMonthIndex - 1, 1);
  const prevMonthIndex = prevMonthDate.getMonth();
  const prevMonthYear = prevMonthDate.getFullYear();

  const daysInCurrentMonth = new Date(currentMonthYear, currentMonthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();
  const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);

  const monthOverMonthData = Array.from({ length: maxDays }).map((_, i) => {
    const day = i + 1;

    const currentMonthVal = nonDraftInvoices
      .filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d.getFullYear() === currentMonthYear && d.getMonth() === currentMonthIndex && d.getDate() === day;
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    const previousMonthVal = nonDraftInvoices
      .filter(inv => {
        const d = new Date(inv.invoiceDate);
        return d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthIndex && d.getDate() === day;
      })
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return {
      day,
      currentMonth: Number(currentMonthVal.toFixed(2)),
      previousMonth: Number(previousMonthVal.toFixed(2))
    };
  });

  // Original 6-month monthly trend data
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(now.getMonth() - i);
    return {
      monthStart: new Date(d.getFullYear(), d.getMonth(), 1),
      monthEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      label: d.toLocaleString('en-US', { month: 'short' })
    };
  }).reverse();

  const trendData = last6Months.map(m => {
    const rev = nonDraftInvoices
      .filter(inv => inv.invoiceDate >= m.monthStart && inv.invoiceDate <= m.monthEnd)
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    return {
      month: m.label,
      revenue: Number(rev.toFixed(2))
    };
  });

  // 5. Receivables status distribution
  const currentOutstanding = nonDraftInvoices
    .filter(inv => inv.dueDate >= now && Number(inv.outstandingAmount) > 0)
    .reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0);

  const overdueOutstanding = nonDraftInvoices
    .filter(inv => inv.dueDate < now && Number(inv.outstandingAmount) > 0)
    .reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0);

  const installmentsOutstanding = nonDraftInvoices
    .filter(inv => inv.subCategory === 'Installment')
    .reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0);

  const corporateOutstanding = nonDraftInvoices
    .filter(inv => inv.category === 'Corporate')
    .reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0);

  const receivablesData = [
    { name: 'Current', value: Number(currentOutstanding.toFixed(3)) },
    { name: 'Overdue', value: Number(overdueOutstanding.toFixed(3)) },
    { name: 'Installments', value: Number(installmentsOutstanding.toFixed(3)) },
    { name: 'Corporate Due', value: Number(corporateOutstanding.toFixed(3)) }
  ];

  // 6. Payment Status count
  const paidCount = nonDraftInvoices.filter(inv => inv.status === 'Paid').length;
  const partialCount = nonDraftInvoices.filter(inv => inv.status === 'PartiallyPaid').length;
  const pendingCount = nonDraftInvoices.filter(inv => ['Issued', 'Overdue'].includes(inv.status)).length;

  const paymentStatusData = [
    { name: 'Paid', value: paidCount },
    { name: 'Partial', value: partialCount },
    { name: 'Pending', value: pendingCount }
  ];

  // 7. Top 5 Corporate Clients
  const corporateClientsMap: Record<string, { name: string; revenue: number }> = {};
  nonDraftInvoices.forEach(inv => {
    if (inv.category === 'Corporate' && inv.corporateAccount) {
      const accId = inv.corporateAccountId!;
      if (!corporateClientsMap[accId]) {
        corporateClientsMap[accId] = {
          name: inv.corporateAccount.accountName,
          revenue: 0
        };
      }
      corporateClientsMap[accId].revenue += Number(inv.totalAmount);
    }
  });

  const topCorporates = Object.values(corporateClientsMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      revenue: Number(c.revenue.toFixed(3))
    }));

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
          ر.ع. {Number(invoice.totalAmount).toFixed(2)}
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
            <Link href="/finance/invoices">
              <Button className="h-10 gap-2">
                Manage Invoices
              </Button>
            </Link>
          </div>
        }
      />

      <FinanceDashboardClient
        kpis={kpis}
        trendData={trendData}
        monthOverMonthData={monthOverMonthData}
        yearOverYearData={yearOverYearData}
        receivablesData={receivablesData}
        paymentStatusData={paymentStatusData}
        topCorporates={topCorporates}
      />

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
            {serializedInvoices.length > 0 ? (
              <ResponsiveDataTable
                data={serializedInvoices}
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
                <Plus className="h-4 w-4 text-indigo-500" /> Create Student/Corporate Invoice
              </Button>
            </Link>
            <Link href="/finance/payments" className="block w-full">
              <Button variant="outline" className="w-full justify-start h-11 gap-3">
                <Plus className="h-4 w-4 text-emerald-500" /> Record Client Payment
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
