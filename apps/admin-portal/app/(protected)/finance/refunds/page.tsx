import { assertPermission, getSession } from '@/lib/auth-guard';
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
  RefreshCcw,
  Eye,
  Plus,
  CheckCircle2,
  Clock3,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import { hasPermission } from '@ims/shared-auth';
import { RefundActionsClient } from './_components/refund-actions-client';

export const metadata = { title: 'Refund Requests - Admin Portal | ASTI IMS' };

export default async function RefundsListPage(props: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    branchId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await assertPermission('refund.request');
  const fullSession = await getSession();
  const canApprove = hasPermission(fullSession, 'refund.approve');

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

  // Query Refunds from DB
  const refunds = await prisma.refund.findMany({
    where: {
      branchId: branchFilter ? branchFilter : { in: allowedBranchIds },
      ...(statusFilter ? { status: statusFilter as any } : {}),
      OR: query
        ? [
            { reasonCode: { contains: query, mode: 'insensitive' } },
            { executionReference: { contains: query, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: true,
      decider: {
        select: {
          email: true,
          person: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const totals = refunds.reduce(
    (acc, ref) => {
      acc.total = acc.total + Number(ref.amount);
      return acc;
    },
    { total: 0 },
  );

  const columns = [
    {
      header: 'ID / Reference',
      render: (ref: any) => (
        <span className="font-mono font-bold text-slate-600 text-xs">
          {ref.referenceNumber || ref.id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Refund Type',
      render: (ref: any) => <Badge variant="outline">{ref.refundType}</Badge>,
    },
    {
      header: 'Reason Code',
      render: (ref: any) => (
        <span className="text-xs font-semibold text-slate-700">
          {ref.reasonCode}
        </span>
      ),
    },
    {
      header: 'Amount Refunded',
      render: (ref: any) => (
        <span className="font-semibold text-rose-600 font-mono text-xs">
          {Number(ref.amount).toFixed(3)} {ref.currency}
        </span>
      ),
    },
    {
      header: 'Requested By',
      render: (ref: any) => (
        <span className="text-xs text-slate-500">{ref.requestedBy}</span>
      ),
    },
    {
      header: 'Decided By',
      render: (ref: any) => {
        const d = ref.decider;
        const name = d?.person
          ? `${d.person.firstName} ${d.person.lastName}`.trim()
          : d?.email;
        return (
          <span className="text-xs text-slate-500">{name || 'Pending'}</span>
        );
      },
    },
    {
      header: 'Status',
      render: (ref: any) => {
        let variant: 'success' | 'warning' | 'error' | 'info' | 'outline' =
          'outline';
        if (ref.status === 'Executed') variant = 'success';
        if (ref.status === 'Approved') variant = 'info';
        if (ref.status === 'Rejected') variant = 'error';
        if (['Requested', 'UnderReview'].includes(ref.status))
          variant = 'warning';
        return <Badge variant={variant}>{ref.status}</Badge>;
      },
    },
    {
      header: 'Actions',
      render: (ref: any) => (
        <div className="flex items-center gap-1">
          <Link href={`/finance/refunds/${ref.id}`}>
            <button
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors"
              title="View Refund Detail"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </Link>
          {canApprove && (
            <RefundActionsClient
              refundId={ref.id}
              status={ref.status}
              refundNumber={ref.refundNumber}
            />
          )}
        </div>
      ),
    },
  ];

  const renderCard = (ref: any) => (
    <Card className="p-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-slate-800">
          {ref.refundNumber}
        </span>
        <Badge
          variant={
            ref.status === 'Executed'
              ? 'success'
              : ['Requested', 'UnderReview'].includes(ref.status)
                ? 'warning'
                : ref.status === 'Rejected'
                  ? 'error'
                  : 'info'
          }
        >
          {ref.status}
        </Badge>
      </div>
      <div className="text-xs text-slate-500">
        Reason Code: {ref.reasonCode}
      </div>
      <div className="flex justify-between items-center text-xs pt-2 border-t">
        <span className="text-slate-400">Amount:</span>
        <span className="font-mono font-semibold text-rose-600">
          {Number(ref.amount).toFixed(3)} {ref.currency}
        </span>
      </div>
      {canApprove && ['Requested', 'Approved'].includes(ref.status) && (
        <div className="pt-2 border-t">
          <RefundActionsClient
            refundId={ref.id}
            status={ref.status}
            refundNumber={ref.refundNumber}
          />
        </div>
      )}
      <div className="pt-2 border-t">
        <Link
          href={`/finance/refunds/${ref.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Eye className="h-3.5 w-3.5" /> View Details
        </Link>
      </div>
    </Card>
  );

  return (
    <AdminListPageLayout>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader
          eyebrow="Finance Operations"
          title="Refund Applications & Requests"
          description="Submit refund requests, track approval workflows, and manage payments reconciliation reversals."
        />
        <Link href="/finance/refunds/create">
          <Button className="h-10 gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Request Refund
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        <StatCard
          title="Total Refunded / Requested"
          value={`${totals.total.toFixed(3)} OMR`}
          description="Sum of refund applications"
          icon={<ArrowDownRight className="h-5 w-5 text-rose-600" />}
        />
      </div>

      <Card className="mt-6 p-card-p">
        <DataTableFilter
          searchPlaceholder="Search refunds by code..."
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
                { label: 'Requested', value: 'Requested' },
                { label: 'Under Review', value: 'UnderReview' },
                { label: 'Approved', value: 'Approved' },
                { label: 'Executed', value: 'Executed' },
                { label: 'Rejected', value: 'Rejected' },
              ],
            },
          ]}
        />

        <div className="mt-4">
          <ResponsiveDataTable
            data={refunds}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(ref: any) => ref.id}
            emptyState={
              <EmptyState
                title="No Refund Requests"
                description="Apply for a refund request to initiate approvals."
                icon={<ArrowDownRight className="h-10 w-10 text-slate-300" />}
              />
            }
          />
        </div>
      </Card>
    </AdminListPageLayout>
  );
}
