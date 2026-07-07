'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  PageHeader,
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  Badge,
  Button,
  LinkButton,
  Textarea,
  Breadcrumbs,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ims/shared-ui';
import { Home, Layers, GraduationCap, RefreshCw, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ApprovalTimelineEntry {
  id: string;
  approvalLevel: string;
  status: string;
  actorId: string;
  actionDate?: Date | null | string;
  remarks?: string | null;
  createdAt: Date | string;
}

interface CompletionDetail {
  id: string;
  enrollmentId: string;
  completionStatus: string;
  attendancePercentage?: number | null;
  examRequired: boolean;
  paymentRequired: boolean;
  manualApprovalRequired: boolean;
  certificateAllowed: boolean;
  evidenceStale: boolean;
  approvalTimeline: ApprovalTimelineEntry[];
}

interface CompletionDetailClientProps {
  completion: CompletionDetail;
  context: {
    studentName: string;
    enrollmentNumber: string;
    courseName: string;
  };
  permissions: string[];
}

function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes(code) || permissions.includes('SUPER_ADMIN');
}

export function CompletionDetailClient({ completion, context, permissions }: CompletionDetailClientProps) {
  const router = useRouter();
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [isReevalDialogOpen, setIsReevalDialogOpen] = useState(false);

  const canRecommend = hasPermission(permissions, 'completion.recommend');
  const canReview = hasPermission(permissions, 'completion.coordinator-review');
  const canApprove = hasPermission(permissions, 'completion.final-approve');
  const canReevaluate = hasPermission(permissions, 'completion.evaluate');

  // Trigger Reevaluation Action
  const handleReevaluate = async () => {
    setLoading('reevaluate');
    const toastId = toast.loading('Reevaluating course completion evidence...');

    try {
      const response = await fetch(`/api/v1/completions/${completion.id}/reevaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.messageEnglish || data.error || 'Failed to reevaluate.');
      }

      toast.success('Evidence reevaluated successfully!', { id: toastId });
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reevaluate.', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  // Submit Workflow Action
  const handleWorkflowAction = async (action: 'recommend' | 'coordinator-review' | 'final-approve', status?: 'Approved' | 'Rejected') => {
    setLoading(action);
    const toastId = toast.loading('Submitting approval action...');

    let endpoint = `/api/v1/completions/${completion.id}/recommend`;
    let bodyPayload: any = { remarks: remarks.trim() || undefined };

    if (action === 'coordinator-review') {
      endpoint = `/api/v1/completions/${completion.id}/coordinator-review`;
      bodyPayload.approved = status === 'Approved';
    } else if (action === 'final-approve') {
      endpoint = `/api/v1/completions/${completion.id}/final-approve`;
      bodyPayload.approved = status === 'Approved';
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.messageEnglish || data.error || 'Failed to perform action.');
      }

      toast.success('Approval action submitted successfully!', { id: toastId });
      setRemarks('');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to perform action.', { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'error' | 'outline' | 'muted'> = {
      Approved: 'success',
      AwaitingTrainerRecommendation: 'info',
      AwaitingCoordinatorReview: 'warning',
      AwaitingFinalApproval: 'warning',
      Rejected: 'error',
      EvidenceIncomplete: 'outline',
      Pending: 'muted',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace(/([A-Z])/g, ' $1').trim()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Completions Portfolio"
        title={context.studentName}
        description={`${context.courseName} • Enrollment #${context.enrollmentNumber}`}
        backUrl="/exam-completion/completions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Completions', href: '/exam-completion/completions', icon: <Layers className="h-3.5 w-3.5" /> },
              { label: context.studentName, icon: <GraduationCap className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {canReevaluate && (
              <Button
                onClick={() => setIsReevalDialogOpen(true)}
                disabled={loading !== null}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading === 'reevaluate' ? 'animate-spin' : ''}`} />
                {loading === 'reevaluate' ? 'Reevaluating...' : 'Reevaluate Evidence'}
              </Button>
            )}
            <LinkButton href="/exam-completion/completions" variant="outline">
              Back to List
            </LinkButton>
          </div>
        }
      />

      {/* Grid of Evidence Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
        {/* Attendance */}
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Attendance Ratio</CardDescription>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-800">
                {completion.attendancePercentage != null ? `${completion.attendancePercentage}%` : 'N/A'}
              </span>
              <Badge variant={completion.attendancePercentage != null && completion.attendancePercentage >= 75 ? 'success' : 'error'}>
                {completion.attendancePercentage != null && completion.attendancePercentage >= 75 ? 'Met' : 'Unmet'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Exams Required */}
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Exam Requirement</CardDescription>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-800">
                {completion.examRequired ? 'Required' : 'Exempt'}
              </span>
              <Badge variant={completion.examRequired ? 'info' : 'outline'}>
                {completion.examRequired ? 'Required' : 'N/A'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Payment Required */}
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Financial Standing</CardDescription>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-800">
                {completion.paymentRequired ? 'Check Clearance' : 'Exempt'}
              </span>
              <Badge variant={completion.paymentRequired ? 'success' : 'outline'}>
                {completion.paymentRequired ? 'Passed' : 'N/A'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Certificate Eligibility */}
        <Card className="bg-white">
          <CardHeader className="pb-2 p-4">
            <CardDescription className="text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">Completion Status</CardDescription>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-base font-bold text-slate-800">
                {completion.certificateAllowed ? 'Allowed' : 'Locked'}
              </span>
              <div className="flex gap-1">{getStatusBadge(completion.completionStatus)}</div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Warnings / Alerts */}
      {completion.evidenceStale && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-800 flex items-start gap-3 animate-fade-in-up">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Stale Evidence Detected:</strong> Student records or attendance have been updated since this completion was evaluated. Please click <span className="font-semibold">Reevaluate Evidence</span> to refresh the metrics.
          </div>
        </div>
      )}

      {/* Workflow Action Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start animate-fade-in-up delay-100">
        {/* Actions Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Trigger Forms */}
          {completion.completionStatus === 'AwaitingTrainerRecommendation' && canRecommend && (
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle>Trainer Recommendation</CardTitle>
                <CardDescription>As the course trainer, recommend this student for completion and certificate issuance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label="Recommendation Remarks"
                  rows={3}
                  placeholder="Enter remarks or feedback regarding student performance..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={loading !== null}
                  required
                />
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => handleWorkflowAction('recommend')}
                    disabled={loading !== null}
                    variant="primary"
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {loading === 'recommend' ? 'Submitting...' : 'Recommend for Approval'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {completion.completionStatus === 'AwaitingCoordinatorReview' && canReview && (
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle>Academic Coordinator Review</CardTitle>
                <CardDescription>Review trainer recommendation and student evidence for completion verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label="Review Remarks"
                  rows={3}
                  placeholder="Provide feedback on the review..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={loading !== null}
                  required
                />
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => handleWorkflowAction('coordinator-review', 'Rejected')}
                    disabled={loading !== null}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Reject & Reevaluate
                  </Button>
                  <Button
                    onClick={() => handleWorkflowAction('coordinator-review', 'Approved')}
                    disabled={loading !== null}
                    variant="primary"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {completion.completionStatus === 'AwaitingFinalApproval' && canApprove && (
            <Card className="bg-white border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle>Final Management Approval</CardTitle>
                <CardDescription>Grant final approval for completion. This will activate certificate generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  label="Final Approval Remarks"
                  rows={3}
                  placeholder="Provide final remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={loading !== null}
                  required
                />
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => handleWorkflowAction('final-approve', 'Rejected')}
                    disabled={loading !== null}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Reject Completion
                  </Button>
                  <Button
                    onClick={() => handleWorkflowAction('final-approve', 'Approved')}
                    disabled={loading !== null}
                    variant="primary"
                  >
                    Approve Course Completion
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!completion.completionStatus.includes('Awaiting') && (
            <Card className="bg-white border border-slate-100 shadow-sm text-center py-8">
              <CardContent className="p-0">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <p className="text-sm font-semibold text-slate-800">
                  {completion.completionStatus === 'Approved'
                    ? 'This course completion has been fully approved!'
                    : 'This completion request has been rejected.'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-[340px] mx-auto">
                  {completion.completionStatus === 'Approved'
                    ? 'The student is now officially marked as graduated and is eligible for QR-code certificate generation.'
                    : 'The evaluation needs re-triggering or review by the coordinator team.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline Sidebar */}
        <Card className="bg-white border border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle>Approval Timeline</CardTitle>
            <CardDescription>Audited workflow transitions for student graduation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-slate-100 pl-4 space-y-6">
              {completion.approvalTimeline.map((step) => {
                const displayStatus: Record<string, 'success' | 'error' | 'muted'> = {
                  Approved: 'success',
                  Rejected: 'error',
                  Pending: 'muted',
                };

                return (
                  <div key={step.id} className="relative">
                    {/* Bullet Indicator */}
                    <span className="absolute -left-[25px] top-1 flex h-4.5 w-4.5 rounded-full border border-white bg-white items-center justify-center">
                      <span className={`h-2.5 w-2.5 rounded-full ${step.status === 'Approved' ? 'bg-emerald-500' : step.status === 'Rejected' ? 'bg-rose-500' : 'bg-slate-300'}`} />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-700">{step.approvalLevel.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      <div className="mt-1 flex gap-2 items-center">
                        <Badge variant={displayStatus[step.status] || 'default'}>
                          {step.status}
                        </Badge>
                        {step.actionDate && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(step.actionDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {step.remarks && (
                        <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs italic text-slate-600 border border-slate-100">
                          "{step.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {completion.approvalTimeline.length === 0 && (
                <p className="text-xs text-slate-400 italic font-medium">No timeline events recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isReevalDialogOpen} onOpenChange={setIsReevalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Evidence Reevaluation
            </DialogTitle>
            <DialogDescription className="mt-2 text-slate-500 font-medium">
              Are you sure you want to re-evaluate the course completion evidence for this student?
              <br /><br />
              <span className="text-amber-700 block bg-amber-50 p-3 rounded-xl border border-amber-200">
                <strong>Warning:</strong> If the completion is currently in progress (e.g., awaiting Trainer Recommendation or Coordinator Review), re-evaluating the evidence will refresh all criteria and reset the workflow back to the beginning of the approval pipeline.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsReevalDialogOpen(false)}
              disabled={loading === 'reevaluate'}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                setIsReevalDialogOpen(false);
                await handleReevaluate();
              }}
              disabled={loading === 'reevaluate'}
            >
              {loading === 'reevaluate' ? 'Reevaluating...' : 'Yes, Reevaluate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
