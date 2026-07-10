'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ims/shared-ui';
import {
  ClipboardList,
  Clock3,
  FileCheck,
  GraduationCap,
  School,
  Eye,
  Award,
  Coins,
  FileText,
  UserCheck,
  Calendar,
} from 'lucide-react';

interface StudentAdmissionRow {
  id: string;
  admissionNumber: string;
  branchName: string;
  admissionStatus: string;
}

interface StudentEnrollmentRow {
  id: string;
  courseName: string;
  batchCode: string;
  branchName: string;
  enrollmentStatus: string;
}

interface StudentDocumentRow {
  id: string;
  fileName: string;
  documentType: string;
  status: string;
  reviewedOn: string | null;
  verifiedBy?: string | null;
  remarks?: string | null;
}

interface StudentAuditRow {
  id: string;
  action: string;
  createdAt: string;
  performedBy: string | null;
}

interface StudentLeadRow {
  id: string;
  leadNumber: string;
  stage: string;
  source: string;
  counselorName: string;
  interestedCourse: string;
  createdAt: string;
}

interface StudentCertificateRow {
  id: string;
  certificateNumber: string;
  courseName: string;
  batchCode: string;
  issuedDate: string | null;
  status: string;
  verificationCode: string;
}

interface StudentInvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
}

interface StudentPaymentRow {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  referenceNumber: string | null;
  status: string;
}

interface StudentAttendanceSummaryRow {
  id: string;
  courseName: string;
  batchCode: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
  attendanceRate: number;
}

interface StudentHistoryTabsProps {
  admissions: StudentAdmissionRow[];
  enrollments: StudentEnrollmentRow[];
  documents: StudentDocumentRow[];
  audits: StudentAuditRow[];
  leads: StudentLeadRow[];
  certificates: StudentCertificateRow[];
  invoices: StudentInvoiceRow[];
  payments: StudentPaymentRow[];
  attendanceSummary: StudentAttendanceSummaryRow[];
  showAdmissions?: boolean;
  showEnrollments?: boolean;
  showDocuments?: boolean;
  showAudits?: boolean;
  showLeads?: boolean;
  showCertificates?: boolean;
  showFinance?: boolean;
  showAttendance?: boolean;
}

function getAdmissionBadgeVariant(status: string) {
  if (status === 'Approved' || status === 'Confirmed') return 'success';
  if (status === 'Pending') return 'warning';
  return 'outline';
}

function getEnrollmentBadgeVariant(status: string) {
  if (['Confirmed', 'Active'].includes(status)) return 'success';
  if (status === 'Pending') return 'warning';
  return 'outline';
}

function getDocumentBadgeVariant(status: string) {
  if (status === 'Approved') return 'success';
  if (status === 'Pending') return 'warning';
  return 'outline';
}

function getLeadBadgeVariant(stage: string) {
  if (stage === 'Converted') return 'success';
  if (['New', 'Contacted', 'InProgress'].includes(stage)) return 'warning';
  return 'outline';
}

function getCertificateBadgeVariant(status: string) {
  if (status === 'Issued') return 'success';
  if (status === 'Revoked') return 'error';
  if (status === 'Replaced') return 'outline';
  return 'warning';
}

function getInvoiceBadgeVariant(status: string) {
  if (status === 'Paid') return 'success';
  if (status === 'PartiallyPaid') return 'warning';
  if (['Unpaid', 'Overdue'].includes(status)) return 'error';
  return 'outline';
}

function getPaymentBadgeVariant(status: string) {
  if (['Cleared', 'Posted'].includes(status)) return 'success';
  if (status === 'Pending') return 'warning';
  return 'error';
}

export function StudentHistoryTabs({
  admissions,
  enrollments,
  documents,
  audits,
  leads,
  certificates,
  invoices,
  payments,
  attendanceSummary,
  showAdmissions = true,
  showEnrollments = true,
  showDocuments = true,
  showAudits = true,
  showLeads = true,
  showCertificates = true,
  showFinance = true,
  showAttendance = true,
}: StudentHistoryTabsProps) {
  const availableTabs = [
    showAdmissions ? 'admissions' : null,
    showEnrollments ? 'enrollments' : null,
    showDocuments ? 'documents' : null,
    showLeads ? 'leads' : null,
    showCertificates ? 'certificates' : null,
    showFinance ? 'finance' : null,
    showAttendance ? 'attendance' : null,
    showAudits ? 'audit' : null,
  ].filter(Boolean) as Array<
    'admissions' | 'enrollments' | 'documents' | 'leads' | 'certificates' | 'finance' | 'attendance' | 'audit'
  >;

  if (availableTabs.length === 0) {
    return null;
  }

  const defaultTab =
    (showAdmissions && admissions.length > 0 && 'admissions') ||
    (showEnrollments && enrollments.length > 0 && 'enrollments') ||
    (showFinance && invoices.length > 0 && 'finance') ||
    (showDocuments && documents.length > 0 && 'documents') ||
    availableTabs[0];

  return (
    <Card className="overflow-hidden border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] shadow-sm">
      <div className="border-b border-[color:var(--ims-border)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--ims-brass-soft)] text-[color:var(--ims-brass)]">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ims-muted)]">
              Lifecycle history
            </p>
            <h3 className="text-lg font-semibold text-[color:var(--ims-ink)]">
              Separate the records by lifecycle
            </h3>
            <p className="text-sm text-[color:var(--ims-muted)]">
              Admissions, enrollments, documents, and audit logs each get their
              own tab so repeated activity stays readable.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-4">
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="w-full flex-wrap justify-start rounded-2xl bg-[color:var(--ims-accent-soft)] p-1 h-auto">
            {showAdmissions && (
              <TabsTrigger
                value="admissions"
                className="gap-2 whitespace-nowrap"
              >
                <School className="h-4 w-4" />
                Admissions{' '}
                <span className="text-xs opacity-70">
                  ({admissions.length})
                </span>
              </TabsTrigger>
            )}
            {showEnrollments && (
              <TabsTrigger
                value="enrollments"
                className="gap-2 whitespace-nowrap"
              >
                <GraduationCap className="h-4 w-4" />
                Enrollments{' '}
                <span className="text-xs opacity-70">
                  ({enrollments.length})
                </span>
              </TabsTrigger>
            )}
            {showFinance && (
              <TabsTrigger
                value="finance"
                className="gap-2 whitespace-nowrap"
              >
                <Coins className="h-4 w-4" />
                Finance{' '}
                <span className="text-xs opacity-70">
                  ({invoices.length + payments.length})
                </span>
              </TabsTrigger>
            )}
            {showDocuments && (
              <TabsTrigger
                value="documents"
                className="gap-2 whitespace-nowrap"
              >
                <FileCheck className="h-4 w-4" />
                Documents{' '}
                <span className="text-xs opacity-70">({documents.length})</span>
              </TabsTrigger>
            )}
            {showLeads && (
              <TabsTrigger
                value="leads"
                className="gap-2 whitespace-nowrap"
              >
                <UserCheck className="h-4 w-4" />
                Leads{' '}
                <span className="text-xs opacity-70">({leads.length})</span>
              </TabsTrigger>
            )}
            {showCertificates && (
              <TabsTrigger
                value="certificates"
                className="gap-2 whitespace-nowrap"
              >
                <Award className="h-4 w-4" />
                Certificates{' '}
                <span className="text-xs opacity-70">({certificates.length})</span>
              </TabsTrigger>
            )}
            {showAttendance && (
              <TabsTrigger
                value="attendance"
                className="gap-2 whitespace-nowrap"
              >
                <Calendar className="h-4 w-4" />
                Attendance{' '}
                <span className="text-xs opacity-70">({attendanceSummary.length})</span>
              </TabsTrigger>
            )}
            {showAudits && (
              <TabsTrigger value="audit" className="gap-2 whitespace-nowrap">
                <ClipboardList className="h-4 w-4" />
                Audit{' '}
                <span className="text-xs opacity-70">({audits.length})</span>
              </TabsTrigger>
            )}
          </TabsList>

          {showAdmissions && (
            <TabsContent value="admissions" className="mt-0">
              {admissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No admissions recorded for this profile.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission Num</TableHead>
                        <TableHead>Campus Branch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admissions.map((admission) => (
                        <TableRow key={admission.id}>
                          <TableCell className="font-mono font-bold">
                            {admission.admissionNumber}
                          </TableCell>
                          <TableCell className="font-medium text-[color:var(--ims-muted)]">
                            {admission.branchName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getAdmissionBadgeVariant(
                                admission.admissionStatus,
                              )}
                            >
                              {admission.admissionStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admissions/${admission.id}`}>
                              <Button variant="outline" size="sm">
                                Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          {showEnrollments && (
            <TabsContent value="enrollments" className="mt-0">
              {enrollments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No course enrollments registered for this student.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="max-w-[220px] font-bold text-[color:var(--ims-ink)]">
                            {enrollment.courseName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {enrollment.batchCode}
                          </TableCell>
                          <TableCell className="text-xs text-[color:var(--ims-muted)]">
                            {enrollment.branchName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getEnrollmentBadgeVariant(
                                enrollment.enrollmentStatus,
                              )}
                            >
                              {enrollment.enrollmentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/enrollments/${enrollment.id}`}>
                              <Button variant="outline" size="sm">
                                Console
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          {showDocuments && (
            <TabsContent value="documents" className="mt-0">
              {documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No files uploaded for verification.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[color:var(--ims-ink)]">
                            {document.fileName}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                            {document.documentType}
                          </p>
                        </div>
                        <Badge
                          variant={getDocumentBadgeVariant(document.status)}
                          className="text-[10px]"
                        >
                          {document.status}
                        </Badge>
                      </div>
                      {document.status === 'Approved' && (
                        <div className="mt-3 rounded-xl bg-green-50/50 border border-green-100 p-3 text-xs text-green-800 space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>{' '}
                            Verified Details
                          </div>
                          {document.verifiedBy && (
                            <div>
                              <span className="font-medium text-slate-500">
                                Verifier:
                              </span>{' '}
                              {document.verifiedBy}
                            </div>
                          )}
                          {document.reviewedOn && (
                            <div>
                              <span className="font-medium text-slate-500">
                                Verified On:
                              </span>{' '}
                              {new Date(
                                document.reviewedOn,
                              ).toLocaleDateString()}
                            </div>
                          )}
                          {document.remarks && (
                            <div>
                              <span className="font-medium text-slate-500">
                                Remarks:
                              </span>{' '}
                              {document.remarks}
                            </div>
                          )}
                        </div>
                      )}
                      {document.status === 'Rejected' && (
                        <div className="mt-3 rounded-xl bg-red-50/50 border border-red-100 p-3 text-xs text-red-800 space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>{' '}
                            Rejection Details
                          </div>
                          {document.verifiedBy && (
                            <div>
                              <span className="font-medium text-slate-500">
                                Verifier:
                              </span>{' '}
                              {document.verifiedBy}
                            </div>
                          )}
                          {document.reviewedOn && (
                            <div>
                              <span className="font-medium text-slate-500">
                                Reviewed On:
                              </span>{' '}
                              {new Date(
                                document.reviewedOn,
                              ).toLocaleDateString()}
                            </div>
                          )}
                          {document.remarks && (
                            <div>
                              <span className="font-medium text-slate-500">
                                Reason:
                              </span>{' '}
                              {document.remarks}
                            </div>
                          )}
                        </div>
                      )}
                      {!['Approved', 'Rejected'].includes(document.status) && (
                        <p className="mt-3 rounded-xl bg-[color:var(--ims-surface-strong)] px-3 py-2 text-xs text-[color:var(--ims-muted)]">
                          No verification review yet.
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <a
                          href={`/api/v1/documents/${document.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <Eye className="h-3.5 w-3.5" /> View / Download
                          Document
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {showFinance && (
            <TabsContent value="finance" className="mt-0 space-y-6">
              {/* Invoices Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[color:var(--ims-ink)] flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-500" /> Linked Invoices
                </h4>
                {invoices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-6 text-sm text-[color:var(--ims-muted)]">
                    No invoices registered for this profile.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-bold">
                              <Link href={`/finance/invoices/${inv.id}`} className="text-indigo-600 hover:text-indigo-800">
                                {inv.invoiceNumber}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs text-[color:var(--ims-muted)]">
                              {new Date(inv.invoiceDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs text-[color:var(--ims-muted)]">
                              {new Date(inv.dueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {inv.totalAmount.toFixed(3)} OMR
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-green-600">
                              {inv.paidAmount.toFixed(3)} OMR
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-red-600 font-semibold">
                              {inv.outstandingAmount.toFixed(3)} OMR
                            </TableCell>
                            <TableCell>
                              <Badge variant={getInvoiceBadgeVariant(inv.status)}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Payments Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-[color:var(--ims-ink)] flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-500" /> Recorded Payments
                </h4>
                {payments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-6 text-sm text-[color:var(--ims-muted)]">
                    No payment transactions recorded.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Ref Number</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((pmt) => (
                          <TableRow key={pmt.id}>
                            <TableCell className="font-mono text-xs font-bold text-[color:var(--ims-muted)]">
                              {pmt.paymentNumber}
                            </TableCell>
                            <TableCell className="text-xs text-[color:var(--ims-muted)]">
                              {new Date(pmt.paymentDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {pmt.paymentMethod}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-emerald-600 font-semibold">
                              {pmt.amount.toFixed(3)} OMR
                            </TableCell>
                            <TableCell className="font-mono text-xs text-[color:var(--ims-muted)]">
                              {pmt.referenceNumber || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getPaymentBadgeVariant(pmt.status)}>
                                {pmt.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {showLeads && (
            <TabsContent value="leads" className="mt-0">
              {leads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No CRM lead records found for this person.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead Num</TableHead>
                        <TableHead>Interested Course</TableHead>
                        <TableHead>Counselor</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-mono font-bold">
                            {lead.leadNumber}
                          </TableCell>
                          <TableCell className="font-medium text-[color:var(--ims-ink)]">
                            {lead.interestedCourse}
                          </TableCell>
                          <TableCell className="text-xs text-[color:var(--ims-muted)]">
                            {lead.counselorName}
                          </TableCell>
                          <TableCell className="text-xs text-[color:var(--ims-muted)]">
                            {lead.source}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getLeadBadgeVariant(lead.stage)}>
                              {lead.stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="outline" size="sm">
                                Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          {showCertificates && (
            <TabsContent value="certificates" className="mt-0">
              {certificates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No certificates issued for this student profile yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Certificate Num</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Issued Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="font-semibold text-[color:var(--ims-ink)]">
                            {cert.certificateNumber}
                          </TableCell>
                          <TableCell className="font-medium text-[color:var(--ims-muted)]">
                            {cert.courseName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {cert.batchCode}
                          </TableCell>
                          <TableCell className="text-xs text-[color:var(--ims-muted)]">
                            {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getCertificateBadgeVariant(cert.status)}>
                              {cert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/verify?code=${cert.verificationCode}`} target="_blank">
                              <Button variant="outline" size="sm" className="gap-1">
                                <Eye className="h-3.5 w-3.5" /> Verify
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          {showAttendance && (
            <TabsContent value="attendance" className="mt-0">
              {attendanceSummary.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No attendance session records exist for this student.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--ims-border)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enrollment Course</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead className="text-center">Total Sessions</TableHead>
                        <TableHead className="text-center text-green-600">Present</TableHead>
                        <TableHead className="text-center text-amber-600">Late</TableHead>
                        <TableHead className="text-center text-red-500">Absent</TableHead>
                        <TableHead className="text-center text-indigo-500">Excused</TableHead>
                        <TableHead className="text-right">Attendance Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceSummary.map((sum) => (
                        <TableRow key={sum.id}>
                          <TableCell className="font-bold text-[color:var(--ims-ink)]">
                            {sum.courseName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {sum.batchCode}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {sum.total}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-green-600 font-semibold">
                            {sum.present}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-amber-600">
                            {sum.late}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-red-500">
                            {sum.absent}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-indigo-500">
                            {sum.excused}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`font-bold text-sm ${sum.attendanceRate >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                                {sum.attendanceRate}%
                              </span>
                              <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className={`h-full ${sum.attendanceRate >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: `${sum.attendanceRate}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          {showAudits && (
            <TabsContent value="audit" className="mt-0">
              {audits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--ims-border)] bg-[color:var(--ims-surface-strong)] px-4 py-8 text-sm text-[color:var(--ims-muted)]">
                  No logs found for this registry record.
                </div>
              ) : (
                <div className="relative space-y-4 border-l border-[color:var(--ims-border)] pl-4 text-xs">
                  {audits.map((audit) => (
                    <div
                      key={audit.id}
                      className="space-y-0.5 border-b border-[color:var(--ims-border)] pb-3 last:border-b-0"
                    >
                      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-[color:var(--ims-brass)]" />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[color:var(--ims-ink)]">
                          {audit.action}
                        </span>
                        <span className="font-mono text-[10px] text-[color:var(--ims-muted)]">
                          {new Date(audit.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[color:var(--ims-muted)]">
                        Operator ID:{' '}
                        <span className="font-mono text-[10px]">
                          {audit.performedBy || 'System'}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Card>
  );
}
