'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bookmark,
  User,
  Activity,
  AlertCircle,
  Home,
  ClipboardList,
  Eye,
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
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
  Badge,
  Breadcrumbs,
  PageHeader,
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
    documents?: Array<{
      id: string | null;
      documentType: string;
      fileName: string | null;
      fileKey: string | null;
      status: string | null;
      verificationOutcome: string;
      verifiedAt: string | null;
      verifiedBy: string | null;
      remarks: string | null;
    }>;
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
  
  const [uploadKeys, setUploadKeys] = useState<Record<string, string>>({});
  const [remarksByDoc, setRemarksByDoc] = useState<Record<string, string>>({});

  const hasPermission = (perm: string) => sessionPermissions.includes(perm);

  const handleUploadDocument = async (docType: string) => {
    const fileKey = uploadKeys[docType];
    if (!fileKey) {
      toast.error('Please enter a valid File URL or Key');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admissions/${detail.admission.id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentType: docType, fileKey }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload document');
      }

      toast.success('Document uploaded successfully!');
      setUploadKeys((prev) => ({ ...prev, [docType]: '' }));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDocument = async (docId: string, outcome: 'Verified' | 'Rejected') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admissions/${detail.admission.id}/documents/${docId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outcome, remarks: remarksByDoc[docId] || '' }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to verify document');
      }

      toast.success(`Document ${outcome.toLowerCase()} successfully!`);
      setRemarksByDoc((prev) => ({ ...prev, [docId]: '' }));
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify document');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'Approved':
        return 'success';
      case 'Submitted':
        return 'info';
      case 'Draft':
        return 'outline';
      case 'Rejected':
        return 'error';
      case 'Cancelled':
        return 'muted';
      default:
        return 'default';
    }
  };

  const { admission, history } = detail;

  const headerActions = (
    <div className="flex items-center gap-2">
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
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={`Admission Details: ${admission.person.firstName} ${admission.person.lastName}`}
        description={`Admission Number: ${admission.admissionNumber}`}
        backUrl="/admissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Admissions', href: '/admissions', icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { label: 'Details', icon: <Eye className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={headerActions}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Application Information */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <Bookmark className="h-4 w-4 text-indigo-600" />
                  Application Information
                </h3>
                <Badge variant={getStatusBadgeVariant(admission.admissionStatus)} className="text-[10px] px-1.5 py-0.5">
                  {admission.admissionStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[color:var(--ims-muted)] block">Interested Course</span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">{admission.courseName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block">Target Campus / Branch</span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">{admission.branchName || 'N/A'}</span>
                </div>
                {admission.studentProfile?.studentNumber && (
                  <div className="md:col-span-2">
                    <span className="text-[color:var(--ims-muted)] block">Student Profile Reference</span>
                    <span className="font-semibold text-emerald-700">{admission.studentProfile.studentNumber}</span>
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

            {/* Learner Profile */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
                <User className="h-4 w-4 text-indigo-600" />
                Learner Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[color:var(--ims-muted)] block">Full Name</span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {admission.person.firstName} {admission.person.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block">Email Address</span>
                  <span className="font-semibold text-[color:var(--ims-ink)] break-all">{admission.person.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block">Mobile Number</span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">{admission.person.mobile || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Required Documents checklist */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
                <FileText className="h-4 w-4 text-indigo-600" />
                Required Documents Checklist
              </h3>

              <div className="space-y-4">
                {admission.documents && admission.documents.length === 0 ? (
                  <p className="text-xs text-[color:var(--ims-muted)] py-2">
                    No document requirements defined for this course/branch.
                  </p>
                ) : (
                  admission.documents?.map((doc) => {
                    const isUploaded = doc.id !== null;
                    const outcome = doc.verificationOutcome;
                    
                    return (
                      <div
                        key={doc.documentType}
                        className="flex flex-col md:flex-row md:items-center justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/50 gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {doc.documentType.replace(/_/g, ' ')}
                            {outcome === 'Verified' && (
                              <Badge variant="success" className="text-[9px] px-1 py-0.2">Verified</Badge>
                            )}
                            {outcome === 'Rejected' && (
                              <Badge variant="error" className="text-[9px] px-1 py-0.2">Rejected</Badge>
                            )}
                            {outcome === 'Pending' && (
                              <Badge variant="info" className="text-[9px] px-1 py-0.2">Pending Verification</Badge>
                            )}
                            {outcome === 'NotUploaded' && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0.2">Missing</Badge>
                            )}
                          </div>
                          {isUploaded ? (
                            <div className="text-[11px] text-slate-600 break-all space-y-0.5">
                              <div>File Name: <span className="font-mono">{doc.fileName}</span></div>
                              <div>File Link: <a href={doc.fileKey || '#'} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">{doc.fileKey}</a></div>
                              {doc.remarks && (
                                <div className="text-rose-600 mt-1 italic">Remarks: {doc.remarks}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[color:var(--ims-muted)]">
                              Please upload the required document below.
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          {!isUploaded || outcome === 'Rejected' ? (
                            <div className="flex items-center gap-2 w-full md:w-auto">
                              <input
                                type="text"
                                placeholder="Paste file URL or Key..."
                                disabled={isSubmitting}
                                value={uploadKeys[doc.documentType] || ''}
                                onChange={(e) =>
                                  setUploadKeys((prev) => ({ ...prev, [doc.documentType]: e.target.value }))
                                }
                                className="block w-48 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                              />
                              <Button
                                onClick={() => handleUploadDocument(doc.documentType)}
                                disabled={isSubmitting || !uploadKeys[doc.documentType]?.trim()}
                                size="sm"
                                className="bg-indigo-600 text-white hover:bg-indigo-700 h-8 flex items-center gap-1 text-[11px]"
                              >
                                <UploadCloud className="h-3.5 w-3.5" /> Upload
                              </Button>
                            </div>
                          ) : outcome === 'Pending' ? (
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                              {hasPermission('admission.approve') && (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="Add optional verification notes..."
                                    disabled={isSubmitting}
                                    value={remarksByDoc[doc.id!] || ''}
                                    onChange={(e) =>
                                      setRemarksByDoc((prev) => ({ ...prev, [doc.id!]: e.target.value }))
                                    }
                                    className="block w-full md:w-60 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button
                                      onClick={() => handleVerifyDocument(doc.id!, 'Verified')}
                                      disabled={isSubmitting}
                                      size="sm"
                                      className="bg-emerald-600 text-white hover:bg-emerald-700 h-7 text-[10px] px-2.5"
                                    >
                                      Verify
                                    </Button>
                                    <Button
                                      onClick={() => handleVerifyDocument(doc.id!, 'Rejected')}
                                      disabled={isSubmitting}
                                      size="sm"
                                      variant="outline"
                                      className="text-rose-600 border-rose-200 hover:bg-rose-50 h-7 text-[10px] px-2.5"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Workflow Status Timeline */}
          <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm h-fit">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
              <Activity className="h-4 w-4 text-indigo-600" />
              Workflow Status Timeline
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-[color:var(--ims-muted)] text-center py-4">
                No timeline history available.
              </p>
            ) : (
              <div className="relative pl-4 border-l border-slate-200 ml-2.5 space-y-5 text-[11px]">
                {history.map((log) => (
                  <div key={log.id} className="relative">
                    <span className="absolute -left-[20.5px] top-1.5 flex h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                    <div className="font-semibold text-slate-800">{log.action}</div>
                    <div className="text-[9px] text-[color:var(--ims-muted)]">
                      {new Date(log.performedAt).toLocaleString()}
                    </div>
                    {log.newValue && (
                      <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 rounded p-1.5 border border-slate-100/50">
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
              className="w-full min-h-[100px] border border-[color:var(--ims-border)] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
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
