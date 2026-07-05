import { assertPermission, getSession } from '@/lib/auth-guard';
import { hasPermission } from '@ims/shared-auth';
import { prisma } from '@ims/database';
import {
  AdminListPageLayout,
  Badge,
  Button,
  Card,
  PageHeader,
} from '@ims/shared-ui';
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  FileText,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RefundActionsClient } from '../_components/refund-actions-client';

export const metadata = { title: 'Refund Detail - Admin Portal | ASTI IMS' };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let variant: 'success' | 'warning' | 'error' | 'info' | 'outline' = 'outline';
  if (status === 'Executed') variant = 'success';
  if (status === 'Approved') variant = 'info';
  if (status === 'Rejected') variant = 'error';
  if (['Requested', 'UnderReview'].includes(status)) variant = 'warning';
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function RefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await assertPermission('refund.request');
  const fullSession = await getSession();
  const canApprove = hasPermission(fullSession, 'refund.approve');

  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      payment: {
        include: {
          invoice: {
            select: { invoiceNumber: true, id: true },
          },
        },
      },
      requester: {
        select: {
          id: true,
          email: true,
          username: true,
          person: { select: { firstName: true, lastName: true } },
        },
      },
      decider: {
        select: {
          id: true,
          email: true,
          username: true,
          person: { select: { firstName: true, lastName: true } },
        },
      },
      branch: { select: { branchName: true, branchCode: true } },
    },
  });

  if (!refund) notFound();

  const displayName = (user: {
    email: string;
    username: string;
    person: { firstName: string; lastName: string } | null;
  } | null) => {
    if (!user) return '—';
    if (user.person) return `${user.person.firstName} ${user.person.lastName}`.trim();
    return user.email || user.username;
  };

  const statusTimeline = [
    { label: 'Requested', done: true, date: refund.requestedAt, outcome: null },
    {
      label: 'Under Review',
      done: ['UnderReview', 'Approved', 'Rejected', 'Executed'].includes(refund.status),
      date: null,
      outcome: null,
    },
    {
      label: 'Decision',
      done: ['Approved', 'Rejected', 'Executed'].includes(refund.status),
      date: refund.decidedAt,
      outcome: refund.status === 'Approved' || refund.status === 'Executed'
        ? 'Approved'
        : refund.status === 'Rejected'
        ? 'Rejected'
        : null,
    },
    {
      label: 'Executed',
      done: refund.status === 'Executed',
      date: refund.executedAt,
      outcome: null,
    },
  ];

  return (
    <AdminListPageLayout>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance/refunds">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </Link>
          <PageHeader
            eyebrow="Finance · Refund Detail"
            title={`Refund ${refund.refundNumber}`}
            description={`${refund.refundType} refund · ${refund.branch.branchName}`}
          />
        </div>
        <StatusBadge status={refund.status} />
      </div>

      {/* Approval Action Panel */}
      {canApprove && ['Requested', 'Approved'].includes(refund.status) && (
        <Card className="mt-6 p-5 border-l-4 border-l-indigo-500 bg-indigo-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-800">
                {refund.status === 'Requested'
                  ? 'This refund is awaiting your approval or rejection.'
                  : 'This refund is approved and awaiting execution.'}
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Amount: {Number(refund.amount).toFixed(3)} {refund.currency}
              </p>
            </div>
            <RefundActionsClient
              refundId={refund.id}
              status={refund.status}
              refundNumber={refund.refundNumber}
            />
          </div>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Core Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Refund Info */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" /> Refund Details
            </h3>
            <InfoRow label="Refund Number" value={<span className="font-mono">{refund.refundNumber}</span>} />
            <InfoRow label="Refund Type" value={<Badge variant="outline">{refund.refundType}</Badge>} />
            <InfoRow
              label="Amount"
              value={
                <span className="text-rose-600 font-mono">
                  {Number(refund.amount).toFixed(3)} {refund.currency}
                </span>
              }
            />
            <InfoRow label="Reason Code" value={refund.reasonCode} />
            <InfoRow label="Reason / Narrative" value={refund.reasonNarrative} />
            {refund.decisionReason && (
              <InfoRow
                label="Decision Reason"
                value={<span className="text-slate-600 italic">{refund.decisionReason}</span>}
              />
            )}
            {refund.executionReference && (
              <InfoRow
                label="Execution Reference"
                value={<span className="font-mono">{refund.executionReference}</span>}
              />
            )}
          </Card>

          {/* Payment Link */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" /> Linked Payment &amp; Invoice
            </h3>
            <InfoRow
              label="Payment ID"
              value={<span className="font-mono text-slate-600">{refund.payment.id.slice(0, 8)}…</span>}
            />
            <InfoRow label="Payment Method" value={refund.payment.paymentMethod} />
            <InfoRow
              label="Payment Amount"
              value={
                <span className="font-mono">
                  {Number(refund.payment.amount).toFixed(3)} {refund.payment.currency}
                </span>
              }
            />
            {refund.payment.invoice && (
              <InfoRow
                label="Invoice"
                value={
                  <Link
                    href={`/finance/invoices/${refund.payment.invoiceId}`}
                    className="text-indigo-600 hover:underline font-mono"
                  >
                    {refund.payment.invoice.invoiceNumber}
                  </Link>
                }
              />
            )}
          </Card>
        </div>

        {/* Right — Timeline + People */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-400" /> Status Timeline
            </h3>
            <ol className="relative border-l border-slate-200 space-y-5 ml-2">
              {statusTimeline.map((step, i) => (
                <li key={i} className="ml-4">
                  <span
                    className={`absolute -left-1.5 mt-0.5 h-3 w-3 rounded-full border-2 ${
                      step.done
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                  <p className={`text-xs font-semibold ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.label}
                    {step.outcome && (
                      <span
                        className={`ml-1.5 text-xs font-bold ${
                          step.outcome === 'Approved' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        — {step.outcome}
                      </span>
                    )}
                  </p>
                  {step.date && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(step.date).toLocaleString('en-OM', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          {/* People */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" /> People
            </h3>
            <InfoRow label="Requested By" value={displayName(refund.requester)} />
            <InfoRow label="Decided By" value={displayName(refund.decider)} />
            <InfoRow
              label="Branch"
              value={`${refund.branch.branchName} (${refund.branch.branchCode})`}
            />
          </Card>
        </div>
      </div>
    </AdminListPageLayout>
  );
}
