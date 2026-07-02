import { notFound } from 'next/navigation';
import { assertPermission } from '@/lib/auth-guard';
import { AdmissionDetailsClient } from './_components/admission-details-client';

export const metadata = { title: 'Admission Details | ASTI IMS' };

export default async function AdmissionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: admissionId } = await props.params;

  // Enforce read permission
  const session = await assertPermission('admission.read');

  const { branchScopeResolver, admissionQueryService } = await import('@/lib/runtime');

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any
  );

  try {
    const detail = await admissionQueryService.getAdmissionDetail(
      admissionId,
      allowedBranchIds.map((id) => id as string)
    );

    // Parse values for client component
    const mappedDetail = {
      admission: {
        ...detail.admission,
        admissionDate: detail.admission.admissionDate.toISOString(),
        submittedAt: detail.admission.submittedAt?.toISOString() || null,
        approvedAt: detail.admission.approvedAt?.toISOString() || null,
        rejectedAt: detail.admission.rejectedAt?.toISOString() || null,
        cancelledAt: detail.admission.cancelledAt?.toISOString() || null,
        documents: detail.admission.documents.map((doc) => ({
          ...doc,
          verifiedAt: doc.verifiedAt?.toISOString() || null,
        })),
      },
      history: detail.history.map((h) => ({
        ...h,
        performedAt: h.performedAt.toISOString(),
        oldValue: h.oldValue ? JSON.stringify(h.oldValue) : null,
        newValue: h.newValue ? JSON.stringify(h.newValue) : null,
      })),
    };

    return (
      <div className="p-6">
        <AdmissionDetailsClient
          detail={mappedDetail}
          sessionUserId={session.userId}
          sessionPermissions={session.permissions}
        />
      </div>
    );
  } catch (error: any) {
    if (error.message.includes('ERR_ADMISSION_NOT_FOUND')) {
      notFound();
    }
    if (error.message.includes('ERR_AUTH_BRANCH_DENIED')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="rounded-full bg-rose-50 p-3 text-rose-600 mb-4 border border-rose-100">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 max-w-md">
            You do not have permission to view this admission record because it belongs to another branch.
          </p>
        </div>
      );
    }
    throw error;
  }
}
