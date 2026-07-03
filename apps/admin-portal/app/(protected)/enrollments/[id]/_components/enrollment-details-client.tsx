'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Calendar,
  User,
  ShieldAlert,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  FileMinus,
  Loader2,
  FileText,
  DollarSign,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@ims/shared-ui';
import { toast } from 'sonner';
import { PricingPanel } from '../../_components/pricing-panel';
import Link from 'next/link';

interface AuditHistoryItem {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  remarks: string;
}

interface EnrollmentDetail {
  id: string;
  enrollmentNumber: string;
  enrollmentStatus: string;
  createdAt: string;
  branchName: string;
  branchId: string;
  courseId: string;
  courseName: string;
  batchId: string;
  batchCode: string;
  studentName: string;
  studentEmail: string;
  studentMobile: string;
  pricingSource: string;
  resolvedPrice: string;
  resolvedDiscount: string;
  finalAmount: string;
  priceEvaluationTimestamp: string | null;
  paymentCollected: string;
  enrollmentType: string;
}

interface EnrollmentDetailsClientProps {
  detail: {
    enrollment: EnrollmentDetail;
    history: AuditHistoryItem[];
  };
  sessionUserId: string;
  sessionPermissions: string[];
}

export function EnrollmentDetailsClient({
  detail,
  sessionUserId,
  sessionPermissions,
}: EnrollmentDetailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { enrollment, history } = detail;

  // Drop Modal State
  const [isDropOpen, setIsDropOpen] = useState(false);
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split('T')[0]);
  const [dropReasonCode, setDropReasonCode] = useState('PERSONAL');
  const [dropRemarks, setDropRemarks] = useState('');

  // Payment Modal State (for Walk-In)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(enrollment.finalAmount);
  const [paymentRemarks, setPaymentRemarks] = useState('Full course fee payment');

  const handleTransition = async (action: 'submit' | 'approve' | 'cancel') => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/enrollments/${enrollment.id}/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.messageEnglish || `Failed to ${action} enrollment.`);
        }

        toast.success(`Enrollment successfully ${action}ed!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || `Failed to transition state.`);
      }
    });
  };

  const handleDropSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/enrollments/${enrollment.id}/drop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            withdrawalDate: new Date(withdrawalDate).toISOString(),
            reasonCode: dropReasonCode,
            remarks: dropRemarks || null,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.messageEnglish || 'Failed to drop enrollment.');
        }

        toast.success('Enrollment dropped successfully. Seat released.');
        setIsDropOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Failed to drop enrollment.');
      }
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/enrollments/${enrollment.id}/walk-in-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentCollected: parseFloat(paymentAmount),
            remarks: paymentRemarks,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.messageEnglish || 'Failed to record walk-in payment.');
        }

        toast.success('Walk-in payment recorded successfully. Enrollment Confirmed.');
        setIsPaymentOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Failed to record payment.');
      }
    });
  };

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'Active':
      case 'Confirmed':
        return 'success';
      case 'Submitted':
      case 'Approved':
        return 'info';
      case 'Draft':
        return 'outline';
      case 'Dropped':
      case 'Cancelled':
        return 'error';
      case 'Completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const canSubmit = enrollment.enrollmentStatus === 'Draft' && sessionPermissions.includes('enrollment.submit');
  const canApprove = enrollment.enrollmentStatus === 'Submitted' && sessionPermissions.includes('enrollment.approve');
  const canCancel = ['Submitted', 'Approved'].includes(enrollment.enrollmentStatus) && sessionPermissions.includes('enrollment.cancel');
  const canDrop = ['Confirmed', 'Active'].includes(enrollment.enrollmentStatus) && sessionPermissions.includes('enrollment.drop');
  const canPay = enrollment.enrollmentType === 'WalkIn' && enrollment.enrollmentStatus === 'Approved' && sessionPermissions.includes('enrollment.walk-in-payment');

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/enrollments" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-indigo-600" />
              Enrollment: {enrollment.enrollmentNumber}
            </h1>
            <Badge variant={getStatusBadgeVariant(enrollment.enrollmentStatus)} className="ml-2">
              {enrollment.enrollmentStatus}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 pl-7">
            Configure learning batch seats, resolve fees, and execute status updates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enrollment info */}
            <Card className="bg-white/80 border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                <h4 className="font-semibold text-slate-800 text-sm uppercase">Enrollment Info</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Course Registered:</span>
                  <span className="font-semibold text-slate-800">{enrollment.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Code:</span>
                  <span className="font-mono font-bold text-slate-800">{enrollment.batchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Campus / Branch:</span>
                  <span className="font-medium text-slate-700">{enrollment.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created At:</span>
                  <span className="font-medium text-slate-700">{new Date(enrollment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            {/* Student info */}
            <Card className="bg-white/80 border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="h-4.5 w-4.5 text-indigo-600" />
                <h4 className="font-semibold text-slate-800 text-sm uppercase">Student identity</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-semibold text-slate-800">{enrollment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="font-medium text-indigo-600">{enrollment.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile Phone:</span>
                  <span className="font-medium text-slate-700">{enrollment.studentMobile}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Pricing resolution panel */}
          <PricingPanel
            pricingSource={enrollment.pricingSource}
            resolvedPrice={enrollment.resolvedPrice}
            resolvedDiscount={enrollment.resolvedDiscount}
            finalAmount={enrollment.finalAmount}
            priceEvaluationTimestamp={enrollment.priceEvaluationTimestamp}
          />

          {/* Operational Audit history */}
          <Card className="bg-white/80 border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock className="h-4.5 w-4.5 text-indigo-600" />
              <h4 className="font-semibold text-slate-800 text-sm uppercase">Lifecycle Audit Log</h4>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No lifecycle transition events recorded.</p>
            ) : (
              <div className="relative border-l border-slate-200 ml-3 pl-4 space-y-5 py-2">
                {history.map((h) => (
                  <div key={h.id} className="relative text-sm space-y-1">
                    <span className="absolute -left-[21px] top-1 bg-indigo-50 border border-indigo-200 rounded-full h-3 w-3 block" />
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-slate-800">{h.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(h.performedAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <span>Performed by: </span>
                      <span className="font-medium">{h.performedBy}</span>
                    </div>
                    <div className="text-xs text-slate-400 bg-slate-50/50 p-2 rounded-lg border border-slate-100 mt-1">
                      {h.remarks}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Actions bar */}
        <div className="space-y-6">
          <Card className="bg-white/80 border border-[color:var(--ims-border)] shadow-sm rounded-2xl p-5 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-indigo-600" />
              Workflow Actions
            </h4>
            <div className="space-y-2.5">
              {canSubmit && (
                <Button
                  onClick={() => handleTransition('submit')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4.5 w-4.5" />}
                  Submit for Review
                </Button>
              )}

              {canApprove && (
                <Button
                  onClick={() => handleTransition('approve')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4.5 w-4.5" />}
                  Approve Enrollment
                </Button>
              )}

              {canPay && (
                <Button
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"
                >
                  <DollarSign className="h-4.5 w-4.5" />
                  Record Walk-In Payment
                </Button>
              )}

              {canCancel && (
                <Button
                  onClick={() => handleTransition('cancel')}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4.5 w-4.5" />}
                  Reject / Cancel
                </Button>
              )}

              {canDrop && (
                <Button
                  onClick={() => setIsDropOpen(true)}
                  disabled={isPending}
                  className="w-full flex justify-center items-center gap-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                >
                  <FileMinus className="h-4.5 w-4.5" />
                  Drop Enrollment
                </Button>
              )}

              {!canSubmit && !canApprove && !canCancel && !canDrop && !canPay && (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  No workflow actions are currently available for this enrollment status.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Drop Enrollment Modal */}
      <Dialog open={isDropOpen} onOpenChange={setIsDropOpen}>
        <DialogContent>
          <form onSubmit={handleDropSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-rose-700">Drop Student Enrollment</DialogTitle>
              <DialogDescription>
                This action is terminal and will withdraw the student from the batch, releasing their seat capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Withdrawal Date</label>
                <input
                  type="date"
                  required
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Drop Reason Code</label>
                <select
                  value={dropReasonCode}
                  onChange={(e) => setDropReasonCode(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
                >
                  <option value="PERSONAL">Personal Reasons</option>
                  <option value="FINANCIAL">Financial Issues</option>
                  <option value="HEALTH">Medical / Health Reasons</option>
                  <option value="ACADEMIC">Academic Conflict</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Remarks / Explanation</label>
                <textarea
                  placeholder="Provide details about the student dropping..."
                  value={dropRemarks}
                  onChange={(e) => setDropRemarks(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] p-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isPending ? 'Dropping...' : 'Confirm Drop'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Walk-In Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Record Walk-In Intake Payment</DialogTitle>
              <DialogDescription>
                Record the physical payment collected at the branch counter to confirm this walk-in enrollment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 font-mono">Total Pending Amount: OMR {Number(enrollment.finalAmount).toFixed(3)}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">OMR</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full h-10 pl-14 rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Payment Notes / Remarks</label>
                <textarea
                  placeholder="Receipt number, payment method, counter notes..."
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] p-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isPending ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
