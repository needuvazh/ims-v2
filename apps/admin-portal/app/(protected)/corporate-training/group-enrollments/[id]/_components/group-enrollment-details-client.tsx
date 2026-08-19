'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Briefcase,
  AlertCircle,
  Building,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Breadcrumbs,
  PageHeader,
} from '@ims/shared-ui';
import {
  raiseGroupEnrollmentBillingAction,
  cancelGroupEnrollmentAction,
} from '../../../actions';

interface Participant {
  corporateEnrollmentId: string;
  billingStatus: string;
  participantId: string;
  enrollmentId: string;
  enrollmentNumber: string;
  enrollmentStatus: string;
  studentProfileId: string | null;
  studentNumber: string | null;
  admissionId: string | null;
  admissionNumber: string | null;
  name: string;
}

interface GroupDetail {
  leaderId: string;
  corporateAccountId: string;
  corporateAccount: any;
  contract: any | null;
  course: any;
  batch: any;
  createdAt: string;
  billingStatus: string;
  status: string;
  cancellationDetails?: {
    cancelledBy: string;
    cancelledAt: string;
    reason: string;
  } | null;
  participants: Participant[];
}

interface GroupEnrollmentDetailsClientProps {
  groupDetail: GroupDetail;
  sessionUserId: string;
  sessionPermissions: string[];
}

export function GroupEnrollmentDetailsClient({
  groupDetail,
  sessionUserId,
  sessionPermissions,
}: GroupEnrollmentDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Client Request');
  const [cancelRemarks, setCancelRemarks] = useState('');

  const {
    leaderId,
    corporateAccountId,
    corporateAccount,
    contract,
    course,
    batch,
    createdAt,
    participants,
    cancellationDetails,
  } = groupDetail;

  const isBatchCompleted = batch?.status === 'Completed';
  const isCancelled = participants.every((p) => p.enrollmentStatus === 'Cancelled');
  const isBilledOrRequested = participants.every(
    (p) => p.billingStatus === 'Requested' || p.billingStatus === 'Invoiced'
  );

  const handleRaiseBilling = () => {
    if (!isBatchCompleted) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await raiseGroupEnrollmentBillingAction(leaderId, sessionUserId);
        if (res.success) {
          setSuccessMsg('Billing successfully requested for all group participants.');
          router.refresh();
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to request billing.');
      }
    });
  };

  const handleCancelClick = () => {
    if (isCancelled) return;
    setIsCancelModalOpen(true);
  };

  const submitCancellation = () => {
    if (isCancelled) return;
    setIsCancelModalOpen(false);
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await cancelGroupEnrollmentAction(
          leaderId,
          cancelReason,
          cancelRemarks,
          sessionUserId
        );
        if (res.success) {
          setSuccessMsg('The group enrollment has been successfully cancelled.');
          router.refresh();
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to cancel group enrollment.');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmed':
      case 'Active':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active / Confirmed</Badge>;
      case 'Completed':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      case 'Cancelled':
      case 'Dropped':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">{status}</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Corporate Accounts', href: '/corporate-training' },
          {
            label: corporateAccount.accountName,
            href: `/corporate-training/accounts/${corporateAccountId}`,
          },
          { label: 'Group Enrollment Detail' },
        ]}
      />

      <PageHeader
        backUrl={`/corporate-training/accounts/${corporateAccountId}`}
        eyebrow={`Sponsor: ${corporateAccount.accountName}`}
        title={`B2B Group Enrollment Console`}
        description={`Registered on ${new Date(createdAt).toLocaleDateString()} | Total Candidates: ${participants.length}`}
        actions={
          <div className="flex gap-2">
            {!isCancelled && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelClick}
                disabled={isPending}
                className="h-9"
              >
                Cancel Entire Group
              </Button>
            )}
            {!isBilledOrRequested && !isCancelled && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleRaiseBilling}
                disabled={isPending || !isBatchCompleted}
                className="h-9 bg-indigo-600 hover:bg-indigo-700"
              >
                Raise Billing Invoice
              </Button>
            )}
          </div>
        }
      />

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isBatchCompleted && !isCancelled && !isBilledOrRequested && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Invoicing Note:</strong> Billing invoice request is disabled because the classroom training batch status is not yet marked as <strong>Completed</strong>.
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2">
          <XCircle className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            <strong>View-Only Mode:</strong> This group enrollment has been cancelled and cannot be re-activated.
          </span>
        </div>
      )}

      {isCancelled && cancellationDetails && (
        <Card className="bg-rose-50/20 border border-rose-200/60 shadow-sm rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-rose-100 pb-2">
            <XCircle className="h-4.5 w-4.5 text-rose-600" />
            <h4 className="font-bold text-rose-800 text-sm uppercase tracking-wide">
              Cancellation Audit Ledger
            </h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
            <div>
              <span className="text-xs text-rose-500/80 block font-semibold uppercase tracking-wider">Cancelled By</span>
              <span className="font-bold text-slate-800">{cancellationDetails.cancelledBy}</span>
            </div>
            <div>
              <span className="text-xs text-rose-500/80 block font-semibold uppercase tracking-wider">Cancelled Date</span>
              <span className="font-medium text-slate-800">{new Date(cancellationDetails.cancelledAt).toLocaleString()}</span>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-rose-100/50">
              <span className="text-xs text-rose-500/80 block font-semibold uppercase tracking-wider mb-0.5">Reason & Description</span>
              <span className="font-medium text-slate-800 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 block whitespace-pre-wrap">
                {cancellationDetails.reason}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Hand: Candidate Roster */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" /> Nominated Candidates & Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                      <th className="p-4">Candidate Name</th>
                      <th className="p-4">Admission Reference</th>
                      <th className="p-4">Enrollment Reference</th>
                      <th className="p-4">Billing Status</th>
                      <th className="p-4 text-center">Seat Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {participants.map((enr) => (
                      <tr key={enr.corporateEnrollmentId} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{enr.name}</div>
                          {enr.studentProfileId ? (
                            <Link
                              href={`/students/${enr.studentProfileId}`}
                              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                            >
                              Profile ({enr.studentNumber})
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">No profile link</span>
                          )}
                        </td>
                        <td className="p-4">
                          {enr.admissionId ? (
                            <Link
                              href={`/admissions/${enr.admissionId}`}
                              className="font-mono text-xs text-indigo-600 hover:underline font-semibold"
                            >
                              {enr.admissionNumber}
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {enr.enrollmentId ? (
                            <Link
                              href={`/enrollments/${enr.enrollmentId}`}
                              className="font-mono text-xs text-indigo-600 hover:underline font-semibold"
                            >
                              {enr.enrollmentNumber}
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {enr.billingStatus === 'Invoiced' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Invoiced</Badge>
                          ) : enr.billingStatus === 'Requested' ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200">Requested</Badge>
                          ) : (
                            <Badge className="bg-slate-50 text-slate-600 border-slate-200">Not Billed</Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {getStatusBadge(enr.enrollmentStatus)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Hand: Context Summary Cards */}
        <div className="space-y-6">
          {/* Corporate Client */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-2 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Building className="h-4.5 w-4.5 text-indigo-600" /> B2B Sponsor Client
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Account Name:</span>
                <span className="font-bold text-slate-800">{corporateAccount.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span>Account Code:</span>
                <span className="font-mono text-slate-800">{corporateAccount.accountCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Billing Location:</span>
                <span className="font-medium text-slate-800">{corporateAccount.branch?.branchName || 'HQ Campus'}</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span>Current Balance:</span>
                <span className="font-semibold text-slate-800">{Number(corporateAccount.currentOutstanding).toFixed(3)} OMR</span>
              </div>
            </CardContent>
          </Card>

          {/* Catalog Course Info */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-2 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-indigo-600" /> Training Catalog Course
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Course Name:</span>
                <span className="font-bold text-slate-800 text-right">{course?.nameEnglish}</span>
              </div>
              <div className="flex justify-between">
                <span>Course Code:</span>
                <span className="font-mono text-slate-800">{course?.courseCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Work Duration:</span>
                <span className="font-medium text-slate-800">{course?.durationHours} Hours</span>
              </div>
            </CardContent>
          </Card>

          {/* Batch Schedule */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-2 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-indigo-600" /> Training Batch Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Batch Code:</span>
                <span className="font-mono text-slate-800 font-bold">{batch?.batchCode || 'Waitlist'}</span>
              </div>
              {batch && (
                <>
                  <div className="flex justify-between">
                    <span>Start Date:</span>
                    <span className="font-medium text-slate-800">{new Date(batch.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Date:</span>
                    <span className="font-medium text-slate-800">{new Date(batch.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span className="font-medium text-slate-800">{batch.capacity} Students</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span>Schedule Status:</span>
                    <span className="font-bold text-slate-800">{batch.status}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract Details */}
          {contract && (
            <Card className="shadow-sm border border-amber-100 bg-amber-50/5">
              <CardHeader className="pb-2 border-b bg-amber-50/20">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-amber-700" /> Associated B2B Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 text-sm text-amber-950/80">
                <div className="flex justify-between">
                  <span>Contract Number:</span>
                  <span className="font-bold text-slate-800">#{contract.contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing Cycle:</span>
                  <span className="font-medium text-slate-800">{contract.billingModel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contract Value:</span>
                  <span className="font-semibold text-slate-800">{Number(contract.contractValue).toFixed(3)} OMR</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-100/50">
                  <span>Contract Status:</span>
                  <span className="font-bold text-slate-800">{contract.status}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Cancel B2B Group Enrollment</h3>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="Client Request">Client Request</option>
                  <option value="Contract Terminated">Contract Terminated</option>
                  <option value="Batch Rescheduled / Postponed">Batch Rescheduled / Postponed</option>
                  <option value="Candidate Non-Attendance">Candidate Non-Attendance</option>
                  <option value="Duplicate Enrollment Error">Duplicate Enrollment Error</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">
                  Detailed Remarks <span className="text-slate-400">(Optional)</span>
                </label>
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  rows={4}
                  placeholder="Provide a detailed explanation for this cancellation..."
                  className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={submitCancellation}
                disabled={isPending}
              >
                {isPending ? "Processing..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
