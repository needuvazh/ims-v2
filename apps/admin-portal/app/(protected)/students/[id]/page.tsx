import { assertPermission } from '@/lib/auth-guard';
import { Card, PageHeader, Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@ims/shared-ui';
import { ChevronLeft, User, Mail, Phone, Calendar, School, GraduationCap, FileCheck, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

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
  const canRevealPII = session.permissions.includes('student.reveal_pii');

  const displayMobile = canRevealPII ? profile.person.mobile : maskPhone(profile.person.mobile);
  const displayEmail = canRevealPII ? profile.person.email : maskEmail(profile.person.email);
  const displayNationalId = canRevealPII ? profile.person.nationalId : '********* (Masked)';

  // Query documents owned by the person or student profile
  const documents = await prisma.documentOwner.findMany({
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
  });

  // Query audit log trail for this student and related entities using correct schema columns (entityId, entityType)
  const audits = await prisma.auditLog.findMany({
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
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Link href="/students">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to Directory
          </Button>
        </Link>
      </div>

      <PageHeader
        eyebrow="Academic Registry"
        title={`${profile.person.firstName} ${profile.person.lastName}`}
        description={`Student Number: ${profile.studentNumber} | Profile Status: ${profile.status}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Personal details */}
        <div className="lg:col-span-1 space-y-6">
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

            <div className="space-y-4 text-sm">
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
                Contact information is masked. You need <strong>student.reveal_pii</strong> permission to reveal complete records.
              </div>
            )}
          </Card>
        </div>

        {/* Right Columns: Admissions, Enrollments, Documents, Audits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admissions Section */}
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <School className="h-5 w-5 text-indigo-500" /> Admissions History
            </h3>

            {profile.admissions.length === 0 ? (
              <p className="text-sm text-slate-400">No admissions recorded for this profile.</p>
            ) : (
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
                  {profile.admissions.map((adm) => (
                    <TableRow key={adm.id}>
                      <TableCell className="font-mono font-bold">{adm.admissionNumber}</TableCell>
                      <TableCell className="font-medium text-slate-700">{adm.branch.branchName}</TableCell>
                      <TableCell>
                        <Badge variant={adm.admissionStatus === 'Approved' ? 'success' : 'outline'}>
                          {adm.admissionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admissions/${adm.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Enrollments Section */}
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <GraduationCap className="h-5 w-5 text-emerald-500" /> Enrollments List
            </h3>

            {profile.enrollments.length === 0 ? (
              <p className="text-sm text-slate-400">No course enrollments registered for this student.</p>
            ) : (
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
                  {profile.enrollments.map((enr) => (
                    <TableRow key={enr.id}>
                      <TableCell className="font-bold text-slate-700 max-w-[200px] truncate">
                        {enr.course.nameEnglish}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{enr.batch.batchCode}</TableCell>
                      <TableCell className="text-xs text-slate-500">{enr.branch.branchName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ['Confirmed', 'Active'].includes(enr.enrollmentStatus)
                              ? 'success'
                              : (enr.enrollmentStatus as string) === 'Pending'
                              ? 'warning'
                              : 'outline'
                          }
                        >
                          {enr.enrollmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/enrollments/${enr.id}`}>
                          <Button variant="outline" size="sm">
                            Console
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Verification Documents Panel */}
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <FileCheck className="h-5 w-5 text-blue-500" /> Uploaded Verification Documents
            </h3>

            {documents.length === 0 ? (
              <p className="text-sm text-slate-400">No files uploaded for verification.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map(({ document: doc }) => {
                  const latestVerification = doc.verifications?.[0];
                  const displayStatus = latestVerification ? (latestVerification.outcome as string) : 'Unverified';
                  return (
                    <div key={doc.id} className="p-3 rounded-lg border border-slate-100 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-700 text-xs">{doc.fileName}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{doc.documentType}</p>
                        </div>
                        <Badge
                          variant={
                            displayStatus === 'Approved'
                              ? 'success'
                              : displayStatus === 'Pending'
                              ? 'warning'
                              : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {displayStatus}
                        </Badge>
                      </div>
                      {latestVerification && (
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded">
                          Reviewed on {new Date(latestVerification.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Chronological Audit Trail Panel */}
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-amber-500" /> Chronological Audit Log
            </h3>

            {audits.length === 0 ? (
              <p className="text-sm text-slate-400">No logs found for this registry record.</p>
            ) : (
              <div className="relative border-l border-slate-100 pl-4 space-y-4 text-xs">
                {audits.map((a) => (
                  <div key={a.id} className="space-y-0.5 border-b border-slate-50 pb-2">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{a.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      Operator ID: <span className="font-mono text-[10px]">{a.performedBy || 'System'}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
