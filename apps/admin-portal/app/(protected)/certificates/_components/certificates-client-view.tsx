'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@ims/shared-ui';
import {
  Award,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Languages,
} from 'lucide-react';
import {
  generateCertificateAction,
  issueCertificateAction,
  submitReissueRequestAction,
  reviewReissueRequestAction,
  generateReplacementCertificateAction,
  revokeCertificateAction,
} from '../actions';

interface CertificatesClientViewProps {
  certificates: any[];
  readinessQueue: any[];
  reissueRequests: any[];
  metrics: {
    totalIssued: number;
    totalRevoked: number;
    totalGenerated: number;
    pendingReissues: number;
  };
  total: number;
  page: number;
  pageSize: number;
  currentTab: string;
}

export function CertificatesClientView({
  certificates,
  readinessQueue,
  reissueRequests,
  metrics,
  total,
  page,
  pageSize,
  currentTab,
}: CertificatesClientViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(currentTab);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState<string | null>(null);

  // Reissue modal state
  const [reissueCertId, setReissueCertId] = useState<string | null>(null);
  const [reissueReason, setReissueReason] = useState('');

  // Revocation modal state
  const [revokeCertId, setRevokeCertId] = useState<string | null>(null);
  const [revokeVersion, setRevokeVersion] = useState<number>(1);
  const [revokeReason, setRevokeReason] = useState('');

  const updateTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set('q', search);
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const triggerGenerate = async (
    enrollmentId: string,
    language: 'en' | 'ar',
  ) => {
    setLoading(`gen-${enrollmentId}`);
    const key = `idem-${enrollmentId}-${Date.now()}`;
    const res = await generateCertificateAction({
      enrollmentId,
      language,
      idempotencyKey: key,
    });
    setLoading(null);

    if (res.success) {
      toast.success(
        'Certificate generated successfully! It is now in the Generated queue.',
      );
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to generate certificate');
    }
  };

  const triggerIssue = async (
    certificateId: string,
    expectedVersion: number,
  ) => {
    setLoading(`issue-${certificateId}`);
    const key = `idem-issue-${certificateId}-${Date.now()}`;
    const res = await issueCertificateAction({
      certificateId,
      expectedVersion,
      idempotencyKey: key,
    });
    setLoading(null);

    if (res.success) {
      toast.success('Certificate issued successfully and notification sent!');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to issue certificate');
    }
  };

  const submitReissue = async () => {
    if (reissueReason.length < 10) {
      toast.error('Reissue reason must be at least 10 characters');
      return;
    }

    setLoading('submitting-reissue');
    const res = await submitReissueRequestAction({
      certificateId: reissueCertId!,
      reason: reissueReason,
    });
    setLoading(null);

    if (res.success) {
      toast.success('Reissue request submitted for approval!');
      setReissueCertId(null);
      setReissueReason('');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to submit reissue request');
    }
  };

  const reviewReissue = async (
    requestId: string,
    decision: 'APPROVE' | 'REJECT',
    version: number,
  ) => {
    setLoading(`review-${requestId}`);
    const res = await reviewReissueRequestAction({
      requestId,
      decision,
      remarks: decision === 'REJECT' ? 'Rejected by manager' : undefined,
      expectedVersion: version,
    });
    setLoading(null);

    if (res.success) {
      toast.success(
        `Reissue request successfully ${decision === 'APPROVE' ? 'Approved' : 'Rejected'}!`,
      );
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to process review');
    }
  };

  const generateReplacement = async (
    reissueRequestId: string,
    version: number,
  ) => {
    setLoading(`replace-${reissueRequestId}`);
    const key = `idem-replace-${reissueRequestId}-${Date.now()}`;
    const res = await generateReplacementCertificateAction({
      reissueRequestId,
      expectedVersion: version,
      idempotencyKey: key,
    });
    setLoading(null);

    if (res.success) {
      toast.success('Replacement certificate issued successfully!');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to generate replacement');
    }
  };

  const submitRevoke = async () => {
    if (revokeReason.length < 10) {
      toast.error('Revocation reason must be at least 10 characters');
      return;
    }

    setLoading('submitting-revoke');
    const res = await revokeCertificateAction({
      certificateId: revokeCertId!,
      reason: revokeReason,
      expectedVersion: revokeVersion,
    });
    setLoading(null);

    if (res.success) {
      toast.success('Certificate successfully revoked!');
      setRevokeCertId(null);
      setRevokeReason('');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to revoke certificate');
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Metrics Dashboard Widget (SCR-CERT-A01) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white shadow-sm border border-indigo-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-indigo-600">
                  Total Issued
                </p>
                <h3 className="text-3xl font-bold text-indigo-900 mt-1">
                  {metrics.totalIssued}
                </h3>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Award className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white shadow-sm border border-amber-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Draft / Generated
                </p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  {metrics.totalGenerated}
                </h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <CheckCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white shadow-sm border border-red-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-red-600">Revoked</p>
                <h3 className="text-3xl font-bold text-red-900 mt-1">
                  {metrics.totalRevoked}
                </h3>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-50 to-white shadow-sm border border-sky-100">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-sky-600">
                  Pending Reissues
                </p>
                <h3 className="text-3xl font-bold text-sky-900 mt-1">
                  {metrics.pendingReissues}
                </h3>
              </div>
              <div className="p-3 bg-sky-500/10 rounded-xl">
                <RotateCcw className="h-6 w-6 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="flex border-b border-gray-200 space-x-6">
        <button
          onClick={() => updateTab('registry')}
          className={`py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'registry'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Certificate Registry
        </button>
        <button
          onClick={() => updateTab('readiness')}
          className={`py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'readiness'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Readiness Queue
        </button>
        <button
          onClick={() => updateTab('reissues')}
          className={`py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'reissues'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Reissue Requests
        </button>
      </div>

      {/* ─── TAB CONTENT: REGISTRY (SCR-CERT-A06) ─── */}
      {activeTab === 'registry' && (
        <Card className="shadow-sm border border-gray-200/80">
          <CardHeader>
            <CardTitle>Certificate Registry</CardTitle>
            <CardDescription>
              Search and manage generated, issued, or revoked certificates.
            </CardDescription>
            <form
              onSubmit={handleSearchSubmit}
              className="flex gap-2 mt-4 max-w-md"
            >
              <Input
                placeholder="Search certificate number, student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-50/50"
              />
              <Button type="submit" variant="secondary" className="flex gap-2">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No certificates found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cert Number</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow
                      key={cert.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell className="font-semibold text-gray-900">
                        {cert.certificateNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-800">
                          {cert.enrollment.studentProfile.person.firstName}{' '}
                          {cert.enrollment.studentProfile.person.lastName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {cert.enrollment.studentProfile.studentNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cert.enrollment.course.nameEnglish}
                      </TableCell>
                      <TableCell className="uppercase text-xs font-bold text-gray-500">
                        {cert.language}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cert.certificateStatus === 'Issued'
                              ? 'success'
                              : cert.certificateStatus === 'Revoked'
                                ? 'error'
                                : cert.certificateStatus === 'Replaced'
                                  ? 'muted'
                                  : 'warning'
                          }
                        >
                          {cert.certificateStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {cert.issuedDate
                          ? new Date(cert.issuedDate).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {cert.certificateStatus === 'Generated' && (
                          <Button
                            size="sm"
                            onClick={() => triggerIssue(cert.id, cert.version)}
                            disabled={loading !== null}
                          >
                            {loading === `issue-${cert.id}`
                              ? 'Issuing...'
                              : 'Issue'}
                          </Button>
                        )}
                        {cert.certificateStatus === 'Issued' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setReissueCertId(cert.id)}
                            >
                              Request Reissue
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRevokeCertId(cert.id);
                                setRevokeVersion(cert.version);
                              }}
                            >
                              Revoke
                            </Button>
                          </>
                        )}
                        <a
                          href={cert.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB CONTENT: READINESS QUEUE (SCR-CERT-A02) ─── */}
      {activeTab === 'readiness' && (
        <Card className="shadow-sm border border-gray-200/80">
          <CardHeader>
            <CardTitle>Certificate Readiness Queue</CardTitle>
            <CardDescription>
              Enrollments that have approved completions and are ready for
              certificate generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readinessQueue.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                All completions have active certificates.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enrollment No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Finance Checks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readinessQueue.map((item) => (
                    <TableRow
                      key={item.enrollmentId}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell className="font-semibold text-gray-700">
                        {item.enrollmentNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-800">
                          {item.studentName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.studentNumber}
                        </div>
                      </TableCell>
                      <TableCell>{item.courseName}</TableCell>
                      <TableCell>{item.branchName}</TableCell>
                      <TableCell>
                        {item.paymentValidationRequired ? (
                          <Badge
                            variant={item.paymentPassed ? 'success' : 'error'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {item.paymentPassed ? (
                              'Validation Passed'
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3" /> Unpaid
                                Dues
                              </>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="muted">Exempt</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          disabled={!item.paymentPassed || loading !== null}
                          onClick={() =>
                            triggerGenerate(item.enrollmentId, 'en')
                          }
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {loading === `gen-${item.enrollmentId}`
                            ? 'Generating...'
                            : 'Generate (EN)'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!item.paymentPassed || loading !== null}
                          onClick={() =>
                            triggerGenerate(item.enrollmentId, 'ar')
                          }
                        >
                          Generate (AR)
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB CONTENT: REISSUE REQUESTS (SCR-CERT-A10) ─── */}
      {activeTab === 'reissues' && (
        <Card className="shadow-sm border border-gray-200/80">
          <CardHeader>
            <CardTitle>Reissue Approvals & Replacement</CardTitle>
            <CardDescription>
              Review certificate reissue requests submitted by counselors and
              generate replacements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reissueRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No reissue requests found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original Cert</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reissueRequests.map((req) => (
                    <TableRow
                      key={req.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <TableCell className="font-semibold text-gray-700">
                        {req.certificate.certificateNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-800">
                          {
                            req.certificate.enrollment.studentProfile.person
                              .firstName
                          }{' '}
                          {
                            req.certificate.enrollment.studentProfile.person
                              .lastName
                          }
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate text-sm text-gray-600"
                        title={req.reason}
                      >
                        {req.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'Completed'
                              ? 'success'
                              : req.status === 'Approved'
                                ? 'info'
                                : req.status === 'Rejected'
                                  ? 'error'
                                  : 'warning'
                          }
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {req.requestedByUser.username}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {req.status === 'PendingReview' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                reviewReissue(req.id, 'APPROVE', req.version)
                              }
                              disabled={loading !== null}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                reviewReissue(req.id, 'REJECT', req.version)
                              }
                              disabled={loading !== null}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {req.status === 'Approved' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              generateReplacement(req.id, req.version)
                            }
                            disabled={loading !== null}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {loading === `replace-${req.id}`
                              ? 'Replacing...'
                              : 'Generate Replacement'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── DIALOG MODAL: REQUEST REISSUE ─── */}
      {reissueCertId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
          <Card className="w-full max-w-md bg-white shadow-2xl p-6 relative rounded-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-indigo-600" /> Request
              Certificate Reissue
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Please specify a clear reason for requesting a reissue. This
              requires manager approval.
            </p>

            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 mt-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={4}
              placeholder="e.g. Correct student name spelling spelling from Al Balushi to Al-Balushi."
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setReissueCertId(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitReissue}
                disabled={loading === 'submitting-reissue'}
              >
                {loading === 'submitting-reissue'
                  ? 'Submitting...'
                  : 'Submit Request'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─── DIALOG MODAL: REVOKE CERTIFICATE ─── */}
      {revokeCertId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
          <Card className="w-full max-w-md bg-white shadow-2xl p-6 relative rounded-2xl border border-red-100">
            <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-600" /> Revoke Credential
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              This operation is irreversible. The certificate status will be
              changed to Revoked and public verifiers will see a REVOKED alert.
            </p>

            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 mt-4 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              rows={4}
              placeholder="e.g. Audit revealed student profile did not meet the mandatory attendance criteria."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setRevokeCertId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitRevoke}
                disabled={loading === 'submitting-revoke'}
              >
                {loading === 'submitting-revoke'
                  ? 'Revoking...'
                  : 'Confirm Revocation'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
