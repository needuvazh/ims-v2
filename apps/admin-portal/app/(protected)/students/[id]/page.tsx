import { assertPermission } from '@/lib/auth-guard';
import { Card, PageHeader, Button } from '@ims/shared-ui';
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  PencilLine,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IdCardPanel } from '../_components/id-card-panel';
import { StudentHistoryTabs } from './_components/student-history-tabs';
import { LearnerProfileCard } from './_components/learner-profile-card';

export const metadata = {
  title: 'Student Profile Dashboard - Admin Portal | ASTI IMS',
};

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length < 7) return phone;
  const last = cleaned.substring(cleaned.length - 3);
  return `${cleaned.substring(0, cleaned.length - 6)}***${last}`;
}

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  return `${local[0]}******${local[local.length - 1]}@${domain}`;
}

export default async function StudentProfileDashboardPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const session = await assertPermission('student.read');

  const { prisma, branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  // Fetch the student profile with relations
  const profile = await prisma.studentProfile.findFirst({
    where: { id: params.id, isDeleted: false },
    include: {
      person: {
        include: {
          leads: {
            where: { isDeleted: false },
            include: {
              interestedCourse: true,
              counselor: {
                select: {
                  username: true,
                  person: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      branch: true,
      admissions: {
        where: { isDeleted: false },
      },
      enrollments: {
        where: { isDeleted: false },
        include: {
          course: true,
          batch: true,
          branch: true,
          attendanceRecords: {
            where: { isDeleted: false },
          },
          corporateEnrollments: {
            where: { isDeleted: false },
            include: {
              corporateAccount: true,
              contract: true,
            },
          },
        },
      },
      certificates: {
        where: { deletedAt: null },
        include: {
          course: true,
          batch: true,
        },
      },
      invoices: {
        where: { isDeleted: false },
        orderBy: { invoiceDate: 'desc' },
      },
      payments: {
        where: { isDeleted: false },
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: true,
        },
      },
    },
  });

  if (!profile) {
    return notFound();
  }

  // Enforce branch scope visibility: Student must have at least one admission or enrollment in operator's branch scopes
  const hasBranchAccess =
    allowedBranchIds.includes(profile.branchId as any) ||
    profile.enrollments.some((enr) =>
      allowedBranchIds.includes(enr.branchId as any),
    );

  if (!hasBranchAccess && allowedBranchIds.length > 0) {
    // If not matching branch scope, return forbidden (redirect or show custom warning)
    return redirect('/students?error=unauthorized_branch');
  }

  // Check reveal PII permissions
  const canRevealPII =
    session.permissions.includes('student.reveal_pii') ||
    session.permissions.includes('student.identity.unmasked.read');
  const canReadDocuments = session.permissions.includes(
    'student.related.document.read',
  );
  const canReadAudits = session.permissions.includes('student.audit.read');
  const canReadAdmissions = session.permissions.includes(
    'student.related.admission.read',
  );
  const canReadEnrollments = session.permissions.includes(
    'student.related.enrollment.read',
  );
  const canManageIdCard =
    session.permissions.includes('student.id_card.issue') ||
    session.permissions.includes('student.idcard.manage');
  const canUpdate =
    session.permissions.includes('student.update') ||
    session.permissions.includes('student.write');

  const canReadLeads =
    session.permissions.includes('student.related.lead.read') ||
    session.permissions.includes('lead.read');
  const canReadCertificates =
    session.permissions.includes('student.related.certificate.read') ||
    session.permissions.includes('certificate.view');
  const canReadPayments =
    session.permissions.includes('student.related.payment.read') ||
    session.permissions.includes('payment.create');
  const canReadAttendance =
    session.permissions.includes('attendance.record.read') ||
    session.permissions.includes('attendance.report.student.view');

  const displayMobile = canRevealPII
    ? profile.person.mobile
    : maskPhone(profile.person.mobile);
  const displayEmail = canRevealPII
    ? profile.person.email
    : maskEmail(profile.person.email);
  const displayNationalId = canRevealPII
    ? profile.person.nationalId
    : '********* (Masked)';

  const displayPassport = canRevealPII
    ? profile.person.passportNumber
    : profile.person.passportNumber
      ? '********* (Masked)'
      : null;
  const displayVisa = canRevealPII
    ? profile.person.visaNumber
    : profile.person.visaNumber
      ? '********* (Masked)'
      : null;

  const documents = canReadDocuments
    ? await prisma.documentOwner.findMany({
        where: {
          ownerId: { in: [profile.id, profile.personId] },
          document: {
            isDeleted: false,
          },
        },
        include: {
          document: {
            include: {
              verifications: {
                orderBy: { createdAt: 'desc' },
                include: {
                  verifier: {
                    select: {
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  // Fetch ID card history for the IdCardPanel
  const idCardHistory = await prisma.studentIdCardHistory.findMany({
    where: { studentProfileId: profile.id, isDeleted: false },
    orderBy: { eventDate: 'desc' },
    take: 20,
    select: {
      id: true,
      eventType: true,
      oldIdCardNumber: true,
      newIdCardNumber: true,
      eventDate: true,
      reason: true,
    },
  });

  // Query audit log trail for this student and related entities using correct schema columns (entityId, entityType)
  const audits = canReadAudits
    ? await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityId: profile.id, entityType: 'StudentProfile' },
            { entityId: profile.personId, entityType: 'Person' },
            ...profile.admissions.map((a) => ({
              entityId: a.id,
              entityType: 'Admission',
            })),
            ...profile.enrollments.map((e) => ({
              entityId: e.id,
              entityType: 'Enrollment',
            })),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      })
    : [];

  const headerActions = canUpdate ? (
    <Link href={`/students/${profile.id}/edit`}>
      <Button variant="outline" size="sm" className="h-8 gap-1">
        <PencilLine className="h-4 w-4" /> Edit Profile
      </Button>
    </Link>
  ) : undefined;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        backUrl="/students"
        eyebrow="Academic Registry"
        title={`${profile.person.firstName} ${profile.person.lastName}`}
        description={`Student Number: ${profile.studentNumber} | Profile Status: ${profile.status}`}
        actions={headerActions}
      />

      <div className="space-y-6">
        {/* Learner profile row */}
        <LearnerProfileCard
          studentProfile={{
            id: profile.id,
            joinedAt: profile.joinedAt instanceof Date ? profile.joinedAt.toISOString() : profile.joinedAt,
            person: {
              firstName: profile.person.firstName,
              lastName: profile.person.lastName,
              photoUrl: profile.person.photoUrl,
              email: profile.person.email,
              mobile: profile.person.mobile,
              nationalId: profile.person.nationalId,
              passportNumber: profile.person.passportNumber,
              visaNumber: profile.person.visaNumber,
              nationality: profile.person.nationality,
              dateOfBirth: profile.person.dateOfBirth ? profile.person.dateOfBirth.toISOString() : null,
              gender: profile.person.gender,
            },
          }}
          displayEmail={displayEmail}
          displayMobile={displayMobile}
          displayNationalId={displayNationalId}
          displayPassport={displayPassport}
          displayVisa={displayVisa}
          canRevealPII={canRevealPII}
        />

        {/* B2B Corporate Account Linkage if student is nominated by corporate client */}
        {(() => {
          const corpEnr = profile.enrollments.find(
            (e) => e.corporateEnrollments && e.corporateEnrollments.length > 0
          );
          if (!corpEnr) return null;
          const link = corpEnr.corporateEnrollments[0];
          return (
            <Card className="bg-amber-50/20 border border-amber-100/70 shadow-sm rounded-2xl p-6">
              <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-amber-600" /> B2B Corporate Client Linkage
              </h3>
              <div className="grid gap-4 sm:grid-cols-3 text-sm text-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Corporate Client</span>
                  <span className="font-bold text-slate-800 text-base">{link.corporateAccount.accountName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Account Code</span>
                  <span className="font-mono text-slate-800 text-base">{link.corporateAccount.accountCode}</span>
                </div>
                {link.contract && (
                  <div>
                    <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Associated Contract</span>
                    <span className="font-semibold text-slate-800 text-base">#{link.contract.contractNumber}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

        {/* ID Card Management Panel */}
        {canManageIdCard && (
          <Card id="id-card-management" className="p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-purple-500" /> ID Card
              Management
            </h3>
            <IdCardPanel
              studentProfileId={profile.id}
              idCardIssued={profile.idCardIssued}
              idCardNumber={profile.idCardNumber ?? null}
              idCardHistory={idCardHistory.map((h) => ({
                ...h,
                eventDate: h.eventDate.toISOString(),
              }))}
            />
          </Card>
        )}

        {/* Lifecycle history row */}
        <StudentHistoryTabs
          showAdmissions={canReadAdmissions}
          showEnrollments={canReadEnrollments}
          showDocuments={canReadDocuments}
          showAudits={canReadAudits}
          showLeads={canReadLeads}
          showCertificates={canReadCertificates}
          showFinance={canReadPayments}
          showAttendance={canReadAttendance}
          admissions={
            canReadAdmissions
              ? profile.admissions.map((adm) => ({
                  id: adm.id,
                  admissionNumber: adm.admissionNumber,
                  branchName: profile.branch?.branchName || 'N/A',
                  admissionStatus: adm.admissionStatus,
                }))
              : []
          }
          enrollments={
            canReadEnrollments
              ? profile.enrollments.map((enr) => ({
                  id: enr.id,
                  courseName: enr.course.nameEnglish,
                  batchCode: enr.batch?.batchCode || 'Course Waitlist (No Batch)',
                  branchName: enr.branch.branchName,
                  enrollmentStatus: enr.enrollmentStatus,
                }))
              : []
          }
          documents={documents.map(({ document: doc }) => {
            const latestVerification = doc.verifications?.[0];

            return {
              id: doc.id,
              fileName: doc.fileName,
              documentType: doc.documentType,
              status: latestVerification
                ? (latestVerification.outcome as string)
                : 'Unverified',
              reviewedOn:
                latestVerification && latestVerification.verifiedAt
                  ? latestVerification.verifiedAt.toISOString()
                  : null,
              verifiedBy:
                latestVerification && latestVerification.verifier
                  ? latestVerification.verifier.username
                  : null,
              remarks: latestVerification ? latestVerification.remarks : null,
            };
          })}
          audits={audits.map((a) => ({
            id: a.id,
            action: a.action,
            createdAt: a.createdAt.toISOString(),
            performedBy: a.performedBy,
          }))}
          leads={
            canReadLeads
              ? profile.person.leads.map((l) => ({
                  id: l.id,
                  leadNumber: l.leadNumber,
                  stage: l.stage,
                  source: l.source,
                  counselorName: l.counselor
                    ? `${l.counselor.person?.firstName || ''} ${l.counselor.person?.lastName || ''}`.trim() || l.counselor.username
                    : 'Unassigned',
                  interestedCourse: l.interestedCourse.nameEnglish,
                  createdAt: l.createdAt.toISOString(),
                }))
              : []
          }
          certificates={
            canReadCertificates
              ? profile.certificates.map((c) => ({
                  id: c.id,
                  certificateNumber: c.certificateNumber,
                  courseName: c.course.nameEnglish,
                  batchCode: c.batch.batchCode,
                  issuedDate: c.issuedDate ? c.issuedDate.toISOString() : null,
                  status: c.certificateStatus,
                  verificationCode: c.verificationCode,
                }))
              : []
          }
          invoices={
            canReadPayments
              ? profile.invoices.map((i) => ({
                  id: i.id,
                  invoiceNumber: i.invoiceNumber,
                  invoiceDate: i.invoiceDate.toISOString(),
                  dueDate: i.dueDate.toISOString(),
                  totalAmount: Number(i.totalAmount),
                  paidAmount: Number(i.paidAmount),
                  outstandingAmount: Number(i.outstandingAmount),
                  status: i.status,
                }))
              : []
          }
          payments={
            canReadPayments
              ? profile.payments.map((p) => ({
                  id: p.id,
                  paymentNumber: p.paymentNumber,
                  paymentDate: p.paymentDate.toISOString(),
                  paymentMethod: p.paymentMethod,
                  amount: Number(p.amount),
                  referenceNumber: p.referenceNumber,
                  status: p.status,
                }))
              : []
          }
          attendanceSummary={
            canReadAttendance
              ? profile.enrollments.map((enr) => {
                  const records = enr.attendanceRecords || [];
                  const total = records.length;
                  const present = records.filter((r) => r.status === 'Present').length;
                  const late = records.filter((r) => r.status === 'Late').length;
                  const absent = records.filter((r) => r.status === 'Absent').length;
                  const excused = records.filter((r) => r.status === 'Excused').length;
                  const unmarked = records.filter((r) => r.status === 'Unmarked').length;

                  const totalForRate = present + late + absent;
                  const attendanceRate = totalForRate > 0 ? Math.round(((present + late) / totalForRate) * 100) : 100;

                  return {
                    id: enr.id,
                    courseName: enr.course.nameEnglish,
                    batchCode: enr.batch?.batchCode || 'No Batch',
                    total,
                    present,
                    late,
                    absent,
                    excused,
                    unmarked,
                    attendanceRate,
                  };
                })
              : []
          }
        />
      </div>
    </div>
  );
}
