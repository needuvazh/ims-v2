import { notFound, redirect } from 'next/navigation';
import { assertAnyPermission } from '@/lib/auth-guard';
import { Breadcrumbs, PageHeader, AdminFormPageLayout } from '@ims/shared-ui';
import { Home, Users, Pencil } from 'lucide-react';
import { StudentProfileForm } from '../../_components/student-profile-form';

export const metadata = { title: 'Edit Student | ASTI IMS' };

export default async function EditStudentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await assertAnyPermission(['student.update', 'student.write']);
  const { branchScopeResolver, prisma } = await import('@/lib/runtime');

  const student = await prisma.studentProfile.findFirst({
    where: { id, isDeleted: false },
    include: { person: true, branch: true },
  });

  if (!student) {
    return notFound();
  }

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );
  if (allowedBranchIds.length > 0 && !allowedBranchIds.includes(student.branchId as any)) {
    return redirect('/students?error=unauthorized_branch');
  }

  return (
    <AdminFormPageLayout>
      <PageHeader
        title="Edit Student"
        description="Update the student profile and identity details."
        backUrl="/students"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3.5 w-3.5" /> },
              { label: 'Students', href: '/students', icon: <Users className="h-3.5 w-3.5" /> },
              { label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />

      <StudentProfileForm
        mode="edit"
        showHeader={false}
        initialValues={{
          studentId: student.id,
          studentNumber: student.studentNumber,
          version: student.version,
          branchId: student.branchId,
          branchName: student.branch.branchName,
          firstName: student.person.firstName,
          lastName: student.person.lastName,
          mobile: student.person.mobile,
          email: student.person.email,
          nationalId: student.person.nationalId,
          passportNumber: student.person.passportNumber,
          visaNumber: student.person.visaNumber,
          nationality: student.person.nationality,
          dateOfBirth: student.person.dateOfBirth ? student.person.dateOfBirth.toISOString().slice(0, 10) : null,
          gender: student.person.gender,
          remarks: student.remarks,
        }}
      />
    </AdminFormPageLayout>
  );
}
