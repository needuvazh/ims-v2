'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  CreditCard,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Trash2,
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
    createdAt: string;
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
      idCardNumber?: string | null;
      idCardIssued?: boolean | null;
    };
    person: {
      id: string;
      firstName: string | undefined;
      lastName: string | undefined;
      email: string | null | undefined;
      mobile: string | null | undefined;
      photoUrl?: string | null | undefined;
      nationalId?: string | null | undefined;
      passportNumber?: string | null | undefined;
      visaNumber?: string | null | undefined;
      nationality?: string | null | undefined;
      dateOfBirth?: string | null | undefined;
      gender?: string | null | undefined;
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
    enrollments?: Array<{
      id: string;
      enrollmentNumber: string;
      courseName: string;
      batchCode: string;
      branchName: string;
      enrollmentStatus: string;
      enrolledAt: string;
    }>;
  };
  history: AuditLogItem[];
}

interface AdmissionDetailsClientProps {
  detail: AdmissionDetail;
  sessionUserId: string;
  sessionPermissions: string[];
}

export function AdmissionDetailsClient({
  detail,
  sessionUserId,
  sessionPermissions,
}: AdmissionDetailsClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  const [uploadKeys, setUploadKeys] = useState<Record<string, string>>({});
  const [remarksByDoc, setRemarksByDoc] = useState<Record<string, string>>({});
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  
  const [isExpandedProfile, setIsExpandedProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [issueReason, setIssueReason] = useState('First issuance on admission');
  const [issueCardNumber, setIssueCardNumber] = useState('');

  const handleDownloadIdCard = async () => {
    toast.success('Downloading student ID card PDF...');
    window.open(
      `/api/v1/admissions/${detail.admission.id}/id-card/download`,
      '_blank',
    );
  };

  const handleRegenerateIdCard = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch(
        `/api/v1/admissions/${detail.admission.id}/id-card/reissue`,
        {
          method: 'POST',
        },
      );
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to reissue ID card');
      }
      toast.success('Student ID card reissued successfully!');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate ID card.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/v1/admissions/${detail.admission.id}/profile-photo`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload photo');
      }

      toast.success('Profile photo uploaded successfully!');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleIssueIdCard = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/students/${detail.admission.studentProfile.id}/id-card`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newIdCardNumber: issueCardNumber.trim(),
            reason: issueReason.trim(),
            eventType: 'Issue',
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.messageEnglish || 'Failed to issue ID card.');
      }
      toast.success('Student ID card issued successfully!');
      setIsIssueOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue ID card');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openIssueModal = () => {
    setIssueCardNumber(detail.admission.studentProfile.studentNumber || '');
    setIssueReason('First issuance on admission');
    setIsIssueOpen(true);
  };

  const hasPermission = (perm: string) => sessionPermissions.includes(perm);

  const handleUploadDocument = async (docType: string) => {
    const file = selectedFiles[docType];
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);

      const res = await fetch(
        `/api/v1/admissions/${detail.admission.id}/documents`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload document');
      }

      toast.success('Document uploaded successfully!');
      setSelectedFiles((prev) => {
        const copy = { ...prev };
        delete copy[docType];
        return copy;
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this document? The entire document will be deleted.',
      )
    )
      return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to delete document');
      }
      toast.success('Document retired successfully!');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDocument = async (
    docId: string,
    outcome: 'Verified' | 'Rejected',
  ) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/admissions/${detail.admission.id}/documents/${docId}/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ outcome, remarks: remarksByDoc[docId] || '' }),
        },
      );

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

  const handleAction = async (
    action: 'submit' | 'approve' | 'cancel' | 'reject',
  ) => {
    setIsSubmitting(true);
    try {
      let body = undefined;
      if (action === 'reject') {
        body = JSON.stringify({ remarks });
      }

      const res = await fetch(
        `/api/v1/admissions/${detail.admission.id}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        },
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.messageEnglish || `Failed to ${action} admission`,
        );
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
      {admission.admissionStatus === 'Draft' &&
        hasPermission('admission.create') && (
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
        description={`Admission Number: ${admission.admissionNumber} | Created On: ${new Date(admission.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
        backUrl="/admissions"
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: 'Dashboard',
                href: '/dashboard',
                icon: <Home className="h-3.5 w-3.5" />,
              },
              {
                label: 'Admissions',
                href: '/admissions',
                icon: <ClipboardList className="h-3.5 w-3.5" />,
              },
              { label: 'Details', icon: <Eye className="h-3.5 w-3.5" /> },
            ]}
          />
        }
        actions={headerActions}
      />

      <div className="space-y-6">
            {/* Application Information */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <Bookmark className="h-4 w-4 text-indigo-600" />
                  Application Information
                </h3>
                <Badge
                  variant={getStatusBadgeVariant(admission.admissionStatus)}
                  className="text-[10px] px-1.5 py-0.5"
                >
                  {admission.admissionStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[color:var(--ims-muted)] block">
                    Interested Course
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {admission.courseName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block">
                    Target Campus / Branch
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {admission.branchName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[color:var(--ims-muted)] block">
                    Created On
                  </span>
                  <span className="font-semibold text-[color:var(--ims-ink)]">
                    {new Date(admission.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                {admission.studentProfile?.studentNumber && (
                  <div>
                    <span className="text-[color:var(--ims-muted)] block">
                      Student Profile Reference
                    </span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {admission.studentProfile.studentNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Rejection remarks */}
              {admission.admissionStatus === 'Rejected' &&
                admission.remarks && (
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <User className="h-4 w-4 text-indigo-600" />
                  Learner Profile
                </h3>
                {admission.studentProfile?.id && (
                  <Link href={`/students/${admission.studentProfile.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 px-3"
                    >
                      <User className="h-3 w-3" /> View Student Profile
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Profile Photo Avatar and Upload */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-inner">
                    {admission.person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/v1/admissions/${admission.id}/profile-photo/view?v=${encodeURIComponent(admission.person.photoUrl)}`}
                        alt="Profile Photo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-slate-400" />
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                {/* Profile Details Grid */}
                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[color:var(--ims-muted)] block">
                        Full Name
                      </span>
                      <span className="font-semibold text-[color:var(--ims-ink)]">
                        {admission.person.firstName} {admission.person.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[color:var(--ims-muted)] block">
                        Email Address
                      </span>
                      <span className="font-semibold text-[color:var(--ims-ink)] break-all">
                        {admission.person.email || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[color:var(--ims-muted)] block">
                        Mobile Number
                      </span>
                      <span className="font-semibold text-[color:var(--ims-ink)]">
                        {admission.person.mobile || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsExpandedProfile(!isExpandedProfile)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold transition-colors focus:outline-none"
                    >
                      {isExpandedProfile ? (
                        <>
                          <ChevronUp className="h-3 w-3" /> Hide Additional Info
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" /> View Additional Info
                        </>
                      )}
                    </button>

                    {isExpandedProfile && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-3 pt-3 border-t border-slate-50 animate-in fade-in duration-200">
                        <div>
                          <span className="text-[color:var(--ims-muted)] block">
                            National / Civil ID
                          </span>
                          <span className="font-semibold text-[color:var(--ims-ink)]">
                            {admission.person.nationalId || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--ims-muted)] block">
                            Passport Number
                          </span>
                          <span className="font-semibold text-[color:var(--ims-ink)]">
                            {admission.person.passportNumber || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--ims-muted)] block">
                            Visa Number
                          </span>
                          <span className="font-semibold text-[color:var(--ims-ink)]">
                            {admission.person.visaNumber || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--ims-muted)] block">
                            Nationality
                          </span>
                          <span className="font-semibold text-[color:var(--ims-ink)]">
                            {admission.person.nationality || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--ims-muted)] block">
                            Date of Birth
                          </span>
                          <span className="font-semibold text-[color:var(--ims-ink)]">
                            {admission.person.dateOfBirth
                              ? new Date(admission.person.dateOfBirth).toLocaleDateString(undefined, {
                                  dateStyle: 'medium',
                                })
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[color:var(--ims-muted)] block">
                            Gender
                          </span>
                          <span className="font-semibold text-[color:var(--ims-ink)]">
                            {admission.person.gender || 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Courses */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] font-display">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Enrolled Courses{' '}
                  <span className="text-xs font-normal text-[color:var(--ims-muted)]">
                    ({admission.enrollments?.length || 0})
                  </span>
                </h3>
                {admission.enrollments && admission.enrollments.length > 5 && (
                  <Link href={`/enrollments?q=${encodeURIComponent(admission.person.email || admission.person.firstName || '')}`}>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] px-3">
                      View All Enrollments
                    </Button>
                  </Link>
                )}
              </div>

              {!admission.enrollments || admission.enrollments.length === 0 ? (
                <div className="text-xs text-[color:var(--ims-muted)] py-2">
                  No courses enrolled yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...(admission.enrollments || [])]
                    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
                    .slice(0, 5)
                    .map((enr) => (
                      <div
                        key={enr.id}
                        className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800">
                                {enr.courseName}
                              </p>
                              <p className="text-[10px] font-mono text-[color:var(--ims-muted)]">
                                Enrollment Num: {enr.enrollmentNumber || 'N/A'}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                enr.enrollmentStatus === 'Confirmed' || enr.enrollmentStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : enr.enrollmentStatus === 'Pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : enr.enrollmentStatus === 'Draft'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                      : enr.enrollmentStatus === 'Cancelled'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                        : enr.enrollmentStatus === 'Completed'
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                          : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {enr.enrollmentStatus}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 border-t border-slate-100/60 pt-2.5">
                            <div>
                              <span className="block text-[9px] text-[color:var(--ims-muted)]">
                                BATCH
                              </span>
                              <span className="font-semibold font-mono">
                                {enr.batchCode}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-[color:var(--ims-muted)]">
                                BRANCH
                              </span>
                              <span className="font-semibold">
                                {enr.branchName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100/60 pt-2 mt-3">
                          <span className="text-[9px] text-[color:var(--ims-muted)]">
                            Enrolled: {new Date(enr.enrolledAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                          <Link href={`/enrollments/${enr.id}`}>
                            <span className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
                              View Enrollment &rarr;
                            </span>
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Required Documents checklist */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
                <FileText className="h-4 w-4 text-indigo-600" />
                Required Documents Checklist
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admission.documents && admission.documents.length === 0 ? (
                  <p className="text-xs text-[color:var(--ims-muted)] py-2 md:col-span-2">
                    No document requirements defined for this course/branch.
                  </p>
                ) : (
                  admission.documents?.map((doc) => {
                    const isUploaded = doc.id !== null;
                    const outcome = doc.verificationOutcome;

                    return (
                      <div
                        key={doc.documentType}
                        className="flex flex-col justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/50 gap-3 text-xs"
                      >
                        <div className="space-y-2">
                          <div className="font-semibold text-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                            <span>{doc.documentType.replace(/_/g, ' ')}</span>
                            {outcome === 'Verified' && (
                              <Badge variant="success" className="text-[9px] px-1 py-0.2">
                                Verified
                              </Badge>
                            )}
                            {outcome === 'Rejected' && (
                              <Badge variant="error" className="text-[9px] px-1 py-0.2">
                                Rejected
                              </Badge>
                            )}
                            {outcome === 'Pending' && (
                              <Badge variant="info" className="text-[9px] px-1 py-0.2">
                                Pending Verification
                              </Badge>
                            )}
                            {outcome === 'NotUploaded' && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0.2">
                                Missing
                              </Badge>
                            )}
                          </div>
                          {isUploaded ? (
                            <div className="text-[11px] text-slate-600 break-all space-y-0.5">
                              <div>
                                File: <span className="font-mono">{doc.fileName}</span>
                              </div>
                              {doc.remarks && (
                                <div className="text-rose-600 mt-1 italic">
                                  Remarks: {doc.remarks}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[color:var(--ims-muted)]">
                              Please upload the required document below.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          {!isUploaded || outcome === 'Rejected' ? (
                            <div className="flex flex-col gap-2 w-full">
                              <input
                                type="file"
                                disabled={isSubmitting}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setSelectedFiles((prev) => ({
                                      ...prev,
                                      [doc.documentType]: file,
                                    }));
                                  }
                                }}
                                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                              />
                              <Button
                                onClick={() => handleUploadDocument(doc.documentType)}
                                disabled={isSubmitting || !selectedFiles[doc.documentType]}
                                size="sm"
                                className="bg-indigo-600 text-white hover:bg-indigo-700 h-7 flex items-center justify-center gap-1 text-[10px] w-full"
                              >
                                <UploadCloud className="h-3 w-3" /> Upload
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 justify-between">
                              <a
                                href={doc.id ? `/api/v1/documents/${doc.id}/download` : doc.fileKey || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[10px] font-medium border border-slate-200 transition-colors"
                              >
                                View
                              </a>
                              {(hasPermission('document.retire') || hasPermission('admission.create')) && (
                                <Button
                                  onClick={() => handleDeleteDocument(doc.id!)}
                                  disabled={isSubmitting}
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50 h-7 text-[10px] px-2 flex items-center gap-1"
                                >
                                  <Trash2 className="h-3 w-3" /> Delete
                                </Button>
                              )}
                            </div>
                          )}

                          {isUploaded && outcome === 'Pending' && hasPermission('admission.approve') && (
                            <div className="space-y-2 mt-2 w-full border-t border-slate-100/60 pt-2">
                              <input
                                type="text"
                                placeholder="Verification notes..."
                                disabled={isSubmitting}
                                value={remarksByDoc[doc.id!] || ''}
                                onChange={(e) =>
                                  setRemarksByDoc((prev) => ({
                                    ...prev,
                                    [doc.id!]: e.target.value,
                                  }))
                                }
                                className="block w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] placeholder-slate-400 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  onClick={() => handleVerifyDocument(doc.id!, 'Verified')}
                                  disabled={isSubmitting}
                                  size="sm"
                                  className="bg-emerald-600 text-white hover:bg-emerald-700 h-6 text-[9px] px-2"
                                >
                                  Verify
                                </Button>
                                <Button
                                  onClick={() => handleVerifyDocument(doc.id!, 'Rejected')}
                                  disabled={isSubmitting}
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50 h-6 text-[9px] px-2"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Student ID Card */}
            {admission.studentProfile?.studentNumber && (
              <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-[color:var(--ims-ink)] border-b border-slate-100 pb-2 font-display">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                  Student Identity Card (Provisioned)
                </h3>

                <div className="flex flex-col md:flex-row items-center gap-6">
                   {/* Mock Visual 3D Flip ID Card Design */}
                  <div className="w-80 h-48 [perspective:1000px] group cursor-pointer">
                    <div className="relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                      
                      {/* Front Side */}
                      <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg border border-indigo-600/50">
                        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                          <CreditCard className="h-48 w-48 -mr-10 -mb-10" />
                        </div>

                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] tracking-widest text-indigo-200 block uppercase font-bold">
                              AL SAUD TRAINING INST.
                            </span>
                            <span className="text-[8px] text-indigo-300 block">
                              ASTI Institute Management System
                            </span>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[8px] hover:bg-emerald-500/20">
                            {admission.studentProfile.idCardIssued ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </div>

                        <div className="my-2 flex gap-3 items-center">
                          <div className="h-14 w-14 rounded-lg bg-indigo-800 border border-indigo-600 flex items-center justify-center text-indigo-300 text-xs overflow-hidden">
                            {admission.person.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/v1/admissions/${admission.id}/profile-photo/view?v=${encodeURIComponent(admission.person.photoUrl)}`}
                                alt="Student Avatar"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              'PHOTO'
                            )}
                          </div>
                          <div className="space-y-0.5 text-left">
                            <span className="text-xs font-semibold block">
                              {admission.person.firstName} {admission.person.lastName}
                            </span>
                            <span className="text-[10px] text-indigo-200 block font-mono">
                              ID:{' '}
                              {admission.studentProfile.idCardNumber || admission.studentProfile.studentNumber}
                            </span>
                            <span className="text-[8px] text-indigo-300 block">
                              Course: {admission.courseName}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-indigo-600/40 pt-2 text-[8px] text-indigo-200">
                          <div>
                            <span>VALID UNTIL: </span>
                            <span className="font-mono">DEC 2026</span>
                          </div>
                          <div className="font-mono">ASTI-STU-CARD</div>
                        </div>
                      </div>

                      {/* Back Side */}
                      <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-indigo-950 rounded-2xl p-4 text-white flex flex-col justify-between shadow-lg border border-indigo-800">
                        <div className="space-y-2">
                          <div className="border-b border-indigo-800 pb-1 flex justify-between items-center">
                            <span className="text-[8px] tracking-widest text-indigo-300 font-bold uppercase">
                              TERMS & CONDITIONS
                            </span>
                            <span className="text-[6px] text-indigo-400 font-mono">ASTI-STU-V2</span>
                          </div>
                          <p className="text-[6.5px] text-indigo-200 leading-relaxed text-left">
                            1. This card is the property of Al Saud Training Institute (ASTI) and is non-transferable.
                            <br />
                            2. Cardholder must present this card upon request by institute authorities.
                            <br />
                            3. If lost or damaged, contact the administration office immediately for a reissue.
                          </p>
                        </div>

                        <div className="space-y-1.5 border-t border-indigo-900 pt-2 text-left">
                          <div className="flex justify-between items-center text-[6px] text-indigo-300">
                            <div>
                              <span className="block font-bold">ASTI Dubai Campus</span>
                              <span>Tel: +971 4 123 4567 | info@asti.ae</span>
                            </div>
                            <div className="text-right">
                              <span className="block border-b border-indigo-700/60 pb-1 w-16 text-center font-serif italic text-[5px]">
                                Registrar
                              </span>
                            </div>
                          </div>

                          {/* Barcode Mock */}
                          <div className="h-5 bg-white rounded flex items-center justify-center p-1">
                            <div className="w-full h-full bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px)]" />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="space-y-3 w-full md:w-64">
                    <div className="text-xs space-y-1">
                      <div className="text-slate-500">
                        ID Card Status:{' '}
                        <span
                          className={`font-semibold ${
                            admission.studentProfile.idCardIssued ? 'text-emerald-600' : 'text-amber-500'
                          }`}
                        >
                          {admission.studentProfile.idCardIssued
                            ? admission.studentProfile.idCardNumber &&
                              admission.studentProfile.idCardNumber !== admission.studentProfile.studentNumber
                              ? 'Reissued & Valid'
                              : 'Generated & Valid'
                            : 'Pending Generation'}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Card Number:{' '}
                        <span className="font-mono">
                          {admission.studentProfile.idCardNumber || admission.studentProfile.studentNumber}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {!admission.studentProfile.idCardIssued ? (
                        <Button
                          onClick={openIssueModal}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-1.5 h-8 flex-1"
                        >
                          Issue ID Card
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={handleDownloadIdCard}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs py-1.5 h-8 flex-1"
                          >
                            Download PDF
                          </Button>
                          <Button
                            onClick={handleRegenerateIdCard}
                            disabled={isRegenerating}
                            variant="outline"
                            className="text-slate-600 hover:bg-slate-50 text-xs py-1.5 h-8 flex-1"
                          >
                            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Workflow Status Timeline */}
            <div className="border border-[color:var(--ims-border)] p-6 rounded-2xl space-y-4 bg-white/80 shadow-sm">
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
                      <div className="font-semibold text-slate-800">
                        {log.action}
                      </div>
                      <div className="text-[9px] text-[color:var(--ims-muted)]">
                        {new Date(log.performedAt).toLocaleString()}
                      </div>
                      {log.newValue && (
                        <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 rounded p-1.5 border border-slate-100/50">
                          {JSON.parse(log.newValue).status && (
                            <span>
                              Status changed to:{' '}
                              <strong>{JSON.parse(log.newValue).status}</strong>
                            </span>
                          )}
                          {JSON.parse(log.newValue).remarks && (
                            <div className="mt-0.5">
                              Remarks: <em>{JSON.parse(log.newValue).remarks}</em>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

      {/* Issue ID Card Form Modal */}
      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Student ID Card</DialogTitle>
            <DialogDescription>
              Assign and print the initial identity card for this student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label htmlFor="issue-card-num" className="text-xs font-semibold text-slate-500 uppercase">
                Card Number
              </label>
              <input
                id="issue-card-num"
                type="text"
                className="w-full h-9 rounded-lg border border-[color:var(--ims-border)] bg-white px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={issueCardNumber}
                onChange={(e) => setIssueCardNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="issue-card-reason" className="text-xs font-semibold text-slate-500 uppercase">
                Reason
              </label>
              <input
                id="issue-card-reason"
                type="text"
                className="w-full h-9 rounded-lg border border-[color:var(--ims-border)] bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleIssueIdCard}
              disabled={isSubmitting || !issueCardNumber.trim() || !issueReason.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isSubmitting ? 'Issuing...' : 'Confirm Issuance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Remarks Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Admission Application</DialogTitle>
            <DialogDescription>
              Please enter the mandatory remarks explaining why this application
              is rejected. This will be stored on the record and shown to other
              coordinators.
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
