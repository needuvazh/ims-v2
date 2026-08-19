import { notFound } from 'next/navigation';
import { assertPermission } from '@/lib/auth-guard';
import { getGroupEnrollmentDetailsAction } from '../../actions';
import { GroupEnrollmentDetailsClient } from './_components/group-enrollment-details-client';

export const metadata = { title: 'B2B Group Enrollment Details | ASTI IMS' };

export default async function GroupEnrollmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: leaderId } = await props.params;

  // Enforce read permission
  const session = await assertPermission('enrollment.read');

  const groupDetail = await getGroupEnrollmentDetailsAction(leaderId);
  if (!groupDetail) {
    notFound();
  }

  // Branch access authorization guard check
  const { branchScopeResolver } = await import('@/lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(
    session.userId as any,
    session.activeBranchId as any,
  );

  if (!allowedBranchIds.includes(groupDetail.corporateAccount.branchId as any)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="rounded-full bg-rose-50 p-3 text-rose-600 mb-4 border border-rose-100">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Access Denied
        </h2>
        <p className="text-sm text-slate-600 max-w-md">
          You do not have permission to view this B2B enrollment record because it belongs to another branch.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <GroupEnrollmentDetailsClient
        groupDetail={groupDetail}
        sessionUserId={session.userId}
        sessionPermissions={session.permissions}
      />
    </div>
  );
}
