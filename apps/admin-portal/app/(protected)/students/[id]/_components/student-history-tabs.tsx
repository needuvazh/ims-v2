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
import { ClipboardList, Clock3, FileCheck, GraduationCap, School } from 'lucide-react';

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
}

interface StudentAuditRow {
  id: string;
  action: string;
  createdAt: string;
  performedBy: string | null;
}

interface StudentHistoryTabsProps {
  admissions: StudentAdmissionRow[];
  enrollments: StudentEnrollmentRow[];
  documents: StudentDocumentRow[];
  audits: StudentAuditRow[];
  showAdmissions?: boolean;
  showEnrollments?: boolean;
  showDocuments?: boolean;
  showAudits?: boolean;
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

export function StudentHistoryTabs({
  admissions,
  enrollments,
  documents,
  audits,
  showAdmissions = true,
  showEnrollments = true,
  showDocuments = true,
  showAudits = true,
}: StudentHistoryTabsProps) {
  const availableTabs = [
    showAdmissions ? 'admissions' : null,
    showEnrollments ? 'enrollments' : null,
    showDocuments ? 'documents' : null,
    showAudits ? 'audit' : null,
  ].filter(Boolean) as Array<'admissions' | 'enrollments' | 'documents' | 'audit'>;

  if (availableTabs.length === 0) {
    return null;
  }

  const defaultTab =
    (showAdmissions && admissions.length > 0 && 'admissions') ||
    (showEnrollments && enrollments.length > 0 && 'enrollments') ||
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
            <h3 className="text-lg font-semibold text-[color:var(--ims-ink)]">Separate the records by lifecycle</h3>
            <p className="text-sm text-[color:var(--ims-muted)]">
              Admissions, enrollments, documents, and audit logs each get their own tab so repeated activity stays readable.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-4">
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="w-full flex-wrap justify-start rounded-2xl bg-[color:var(--ims-accent-soft)] p-1">
            {showAdmissions && (
              <TabsTrigger value="admissions" className="gap-2 whitespace-nowrap">
                <School className="h-4 w-4" />
                Admissions <span className="text-xs opacity-70">({admissions.length})</span>
              </TabsTrigger>
            )}
            {showEnrollments && (
              <TabsTrigger value="enrollments" className="gap-2 whitespace-nowrap">
                <GraduationCap className="h-4 w-4" />
                Enrollments <span className="text-xs opacity-70">({enrollments.length})</span>
              </TabsTrigger>
            )}
            {showDocuments && (
              <TabsTrigger value="documents" className="gap-2 whitespace-nowrap">
                <FileCheck className="h-4 w-4" />
                Documents <span className="text-xs opacity-70">({documents.length})</span>
              </TabsTrigger>
            )}
            {showAudits && (
              <TabsTrigger value="audit" className="gap-2 whitespace-nowrap">
                <ClipboardList className="h-4 w-4" />
                Audit <span className="text-xs opacity-70">({audits.length})</span>
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
                        <TableCell className="font-mono font-bold">{admission.admissionNumber}</TableCell>
                        <TableCell className="font-medium text-[color:var(--ims-muted)]">{admission.branchName}</TableCell>
                        <TableCell>
                          <Badge variant={getAdmissionBadgeVariant(admission.admissionStatus)}>
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
                        <TableCell className="font-mono text-xs">{enrollment.batchCode}</TableCell>
                        <TableCell className="text-xs text-[color:var(--ims-muted)]">{enrollment.branchName}</TableCell>
                        <TableCell>
                          <Badge variant={getEnrollmentBadgeVariant(enrollment.enrollmentStatus)}>
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
                  <div key={document.id} className="rounded-2xl border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[color:var(--ims-ink)]">{document.fileName}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ims-muted)]">
                          {document.documentType}
                        </p>
                      </div>
                      <Badge variant={getDocumentBadgeVariant(document.status)} className="text-[10px]">
                        {document.status}
                      </Badge>
                    </div>
                    {document.reviewedOn ? (
                      <p className="mt-3 rounded-xl bg-[color:var(--ims-surface-strong)] px-3 py-2 text-xs text-[color:var(--ims-muted)]">
                        Reviewed on {new Date(document.reviewedOn).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="mt-3 rounded-xl bg-[color:var(--ims-surface-strong)] px-3 py-2 text-xs text-[color:var(--ims-muted)]">
                        No verification review yet.
                      </p>
                    )}
                  </div>
                ))}
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
                <div key={audit.id} className="space-y-0.5 border-b border-[color:var(--ims-border)] pb-3 last:border-b-0">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-[color:var(--ims-brass)]" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[color:var(--ims-ink)]">{audit.action}</span>
                      <span className="font-mono text-[10px] text-[color:var(--ims-muted)]">
                        {new Date(audit.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[color:var(--ims-muted)]">
                      Operator ID: <span className="font-mono text-[10px]">{audit.performedBy || 'System'}</span>
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
