import { assertPermission } from '@/lib/auth-guard';
import { Card, PageHeader, Button } from '@ims/shared-ui';
import { ChevronLeft, User, Mail, Phone, Calendar, CreditCard, PencilLine } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IdCardPanel } from '../_components/id-card-panel';
import { StudentHistoryTabs } from './_components/student-history-tabs';

export const metadata = { title: 'Student Profile Dashboard - Admin Portal | ASTI IMS' };

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
    session.activeBranchId as any
  );

  // Fetch the student profile with relations
  const profile = await prisma.studentProfile.findFirst({
    where: { id: params.id, isDeleted: false },
    include: {
      person: true,
      admissions: {
        where: { isDeleted: false },
        include: {
          branch: true,
        },
      },
      enrollments: {
        where: { isDeleted: false },
        include: {
          course: true,
          batch: true,
          branch: true,
        },
      },
    },
  });

  if (!profile) {
    return notFound();
  }

  // Enforce branch scope visibility: Student must have at least one admission or enrollment in operator's branch scopes
  const hasBranchAccess = profile.admissions.some((adm) => allowedBranchIds.includes(adm.branchId as any)) ||
    profile.enrollments.some((enr) => allowedBranchIds.includes(enr.branchId as any));

  if (!hasBranchAccess && allowedBranchIds.length > 0) {
    // If not matching branch scope, return forbidden (redirect or show custom warning)
    return redirect('/students?error=unauthorized_branch');
  }

  // Check reveal PII permissions
  const canRevealPII = session.permissions.includes('student.reveal_pii') || session.permissions.includes('student.identity.unmasked.read');
  const canReadDocuments = session.permissions.includes('student.related.document.read');
  const canReadAudits = session.permissions.includes('student.audit.read');
  const canReadAdmissions = session.permissions.includes('student.related.admission.read');
  const canReadEnrollments = session.permissions.includes('student.related.enrollment.read');
  const canManageIdCard = session.permissions.includes('student.id_card.issue') || session.permissions.includes('student.idcard.manage');
  const canUpdate = session.permissions.includes('student.update') || session.permissions.includes('student.write');

  const displayMobile = canRevealPII ? profile.person.mobile : maskPhone(profile.person.mobile);
  const displayEmail = canRevealPII ? profile.person.email : maskEmail(profile.person.email);
  const displayNationalId = canRevealPII ? profile.person.nationalId : '********* (Masked)';

  // Query documents owned by the person or student profile
  const documents = canReadDocuments
    ? await prisma.documentOwner.findMany({
        where: {
          ownerId: { in: [profile.id, profile.personId] },
        },
        include: {
          document: {
            include: {
              verifications: true,
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
            ...(profile.admissions.map((a) => ({ entityId: a.id, entityType: 'Admission' }))),
            ...(profile.enrollments.map((e) => ({ entityId: e.id, entityType: 'Enrollment' }))),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      })
    : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/students">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to Directory
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {canUpdate && (
            <Link href={`/students/${profile.id}/edit`}>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <PencilLine className="h-4 w-4" /> Edit Profile
              </Button>
            </Link>
          )}
        </div>
      </div>

      <PageHeader
        eyebrow="Academic Registry"
        title={`${profile.person.firstName} ${profile.person.lastName}`}
        description={`Student Number: ${profile.studentNumber} | Profile Status: ${profile.status}`}
      />

      <div className="space-y-6">
        {/* Learner profile row */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="h-10 w-10 rounded-full bg-[color:var(--ims-brass-soft)] flex items-center justify-center text-[color:var(--ims-brass)]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Learner Profile</h3>
              <p className="text-xs text-slate-400">Canonical Identity Details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">National/Civil ID</span>
              <p className="font-semibold text-slate-700">{displayNationalId}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Mobile Phone
              </span>
              <p className="font-semibold text-slate-700">{displayMobile || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email address
              </span>
              <p className="font-semibold text-slate-700 break-all">{displayEmail || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Registry Joined At
              </span>
              <p className="font-semibold text-slate-700">
                {new Date(profile.joinedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          {!canRevealPII && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs">
              Contact information is masked. You need <strong>student.identity.unmasked.read</strong> or <strong>student.reveal_pii</strong> permission to reveal complete records.
            </div>
          )}
        </Card>

        {/* ID Card Management Panel */}
        {canManageIdCard && (
          <Card id="id-card-management" className="p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-purple-500" /> ID Card Management
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
          admissions={canReadAdmissions ? profile.admissions.map((adm) => ({
            id: adm.id,
            admissionNumber: adm.admissionNumber,
            branchName: adm.branch.branchName,
            admissionStatus: adm.admissionStatus,
          })) : []}
          enrollments={canReadEnrollments ? profile.enrollments.map((enr) => ({
            id: enr.id,
            courseName: enr.course.nameEnglish,
            batchCode: enr.batch.batchCode,
            branchName: enr.branch.branchName,
            enrollmentStatus: enr.enrollmentStatus,
          })) : []}
          documents={documents.map(({ document: doc }) => {
            const latestVerification = doc.verifications?.[0];

            return {
              id: doc.id,
              fileName: doc.fileName,
              documentType: doc.documentType,
              status: latestVerification ? (latestVerification.outcome as string) : 'Unverified',
              reviewedOn: latestVerification ? latestVerification.createdAt.toISOString() : null,
            };
          })}
          audits={audits.map((a) => ({
            id: a.id,
            action: a.action,
            createdAt: a.createdAt.toISOString(),
            performedBy: a.performedBy,
          }))}
        />
      </div>
    </div>
  );
}
