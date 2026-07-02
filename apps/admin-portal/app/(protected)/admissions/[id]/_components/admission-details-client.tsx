'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Bookmark,
  Building,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@ims/shared-ui';

interface AuditLogItem {
  id: string;
  action: string;
  performedBy: string | null;
  performedAt: string;
  oldValue: string | null;
  newValue: string | null;
}

interface AdmissionDetail {
  admission: {
    id: string;
    admissionNumber: string;
    admissionStatus: string;
    admissionDate: string;
    submittedAt: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    rejectedAt: string | null;
    rejectedBy: string | null;
    cancelledAt: string | null;
    cancelledBy: string | null;
    remarks: string | null;
    branchId: string;
    branchName: string | undefined;
    courseId: string | null;
    courseName: string | undefined;
    studentProfile: {
      id: string;
      studentNumber: string | undefined;
      status: string | undefined;
    };
    person: {
      id: string;
      firstName: string | undefined;
      lastName: string | undefined;
      email: string | null | undefined;
      mobile: string | null | undefined;
    };
    leadId: string | null;
  };
  history: AuditLogItem[];
}

interface AdmissionDetailsClientProps {
  detail: AdmissionDetail;
  sessionUserId: string;
  sessionPermissions: string[];
}

export function AdmissionDetailsClient({ detail, sessionUserId, sessionPermissions }: AdmissionDetailsClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  const hasPermission = (perm: string) => sessionPermissions.includes(perm);

  const handleAction = async (action: 'submit' | 'approve' | 'cancel' | 'reject') => {
    setIsSubmitting(true);
    try {
      let body = undefined;
      if (action === 'reject') {
        body = JSON.stringify({ remarks });
      }

      const res = await fetch(`/api/v1/admissions/${detail.admission.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || `Failed to ${action} admission`);
      }

      toast.success(`Admission ${action}ed successfully!`);
      setIsRejectOpen(false);
      setRemarks('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} admission`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Submitted':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Draft':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Rejected':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Cancelled':
        return 'text-slate-600 bg-slate-100 border-slate-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'Submitted':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'Draft':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'Cancelled':
        return <XCircle className="h-5 w-5 text-slate-400" />;
      default:
        return null;
    }
  };

  const { admission, history } = detail;

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admissions" className="rounded-lg border p-2 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[color:var(--ims-foreground)]">
                Admission Detail
              </h1>
              <span className="font-mono text-sm text-[color:var(--ims-muted)]">
                ({admission.admissionNumber})
              </span>
            </div>
            <p className="text-xs text-[color:var(--ims-muted)]">
              Created on {new Date(admission.admissionDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action button panel */}
        <div className="flex flex-wrap items-center gap-3">
          {admission.admissionStatus === 'Draft' && hasPermission('admission.create') && (
            <>
              <Button
                onClick={() => handleAction('submit')}
                disabled={isSubmitting}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
              <Button
                onClick={() => handleAction('cancel')}
                disabled={isSubmitting}
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Cancel Application
              </Button>
            </>
          )}

          {admission.admissionStatus === 'Submitted' && (
            <>
              {hasPermission('admission.approve') && (
                <>
                  <Button
                    onClick={() => handleAction('approve')}
                    disabled={isSubmitting}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {isSubmitting ? 'Approving...' : 'Approve Application'}
                  </Button>
                  <Button
                    onClick={() => setIsRejectOpen(true)}
                    disabled={isSubmitting}
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Reject Application
                  </Button>
                </>
              )}
              {hasPermission('admission.create') && (
                <Button
                  onClick={() => handleAction('cancel')}
                  disabled={isSubmitting}
                  variant="outline"
                  className="text-slate-600"
                >
                  Cancel Application
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Info Blocks */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Detail overview */}
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-semibold text-slate-800">Application Info</h2>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(admission.admissionStatus)}`}>
                {getStatusIcon(admission.admissionStatus)}
                {admission.admissionStatus}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-2.5">
                <Bookmark className="h-4 w-4 text-[color:var(--ims-muted)] mt-0.5" />
                <div>
                  <div className="text-xs text-[color:var(--ims-muted)]">Interested Course</div>
                  <div className="font-semibold">{admission.courseName || 'N/A'}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building className="h-4 w-4 text-[color:var(--ims-muted)] mt-0.5" />
                <div>
                  <div className="text-xs text-[color:var(--ims-muted)]">Target Campus</div>
                  <div className="font-semibold">{admission.branchName || 'N/A'}</div>
                </div>
              </div>

              {admission.studentProfile?.studentNumber && (
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <User className="h-4 w-4 text-[color:var(--ims-muted)] mt-0.5" />
                  <div>
                    <div className="text-xs text-[color:var(--ims-muted)]">Student Profile Reference</div>
                    <div className="font-semibold text-green-700">{admission.studentProfile.studentNumber}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Rejection remarks */}
            {admission.admissionStatus === 'Rejected' && admission.remarks && (
              <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-sm text-rose-800">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Rejection Remarks
                </div>
                <p className="whitespace-pre-wrap">{admission.remarks}</p>
              </div>
            )}
          </div>

          {/* Student Profile Info */}
          <div className="rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800 border-b pb-3">Learner Profile</h2>

            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-[color:var(--ims-muted)] mt-0.5" />
                <div>
                  <div className="text-xs text-[color:var(--ims-muted)]">Name</div>
                  <div className="font-semibold">
                    {admission.person.firstName} {admission.person.lastName}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-[color:var(--ims-muted)] mt-0.5" />
                <div>
                  <div className="text-xs text-[color:var(--ims-muted)]">Email Address</div>
                  <div className="font-semibold break-all">{admission.person.email || 'N/A'}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-[color:var(--ims-muted)] mt-0.5" />
                <div>
                  <div className="text-xs text-[color:var(--ims-muted)]">Mobile Number</div>
                  <div className="font-semibold">{admission.person.mobile || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline block */}
        <div className="rounded-xl border border-[color:var(--ims-border)] bg-[color:var(--ims-card)] p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800 border-b pb-3">Workflow Status Timeline</h2>
          {history.length === 0 ? (
            <p className="text-xs text-[color:var(--ims-muted)] text-center py-4">
              No timeline history available.
            </p>
          ) : (
            <div className="relative pl-4 border-l border-slate-200 ml-2.5 space-y-5 text-sm">
              {history.map((log) => (
                <div key={log.id} className="relative">
                  <span className="absolute -left-[20.5px] top-1.5 flex h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                  <div className="text-xs font-semibold text-slate-800">{log.action}</div>
                  <div className="text-[10px] text-[color:var(--ims-muted)]">
                    {new Date(log.performedAt).toLocaleString()}
                  </div>
                  {log.newValue && (
                    <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 rounded p-1">
                      {JSON.parse(log.newValue).status && (
                        <span>Status changed to: <strong>{JSON.parse(log.newValue).status}</strong></span>
                      )}
                      {JSON.parse(log.newValue).remarks && (
                        <div className="mt-0.5">Remarks: <em>{JSON.parse(log.newValue).remarks}</em></div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Remarks Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Admission Application</DialogTitle>
            <DialogDescription>
              Please enter the mandatory remarks explaining why this application is rejected. This will be stored on the record and shown to other coordinators.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <textarea
              className="w-full min-h-[100px] border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Enter rejection reason here..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => handleAction('reject')}
              disabled={isSubmitting || !remarks.trim()}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
