import { getSession } from '../../lib/auth-guard';
import { createUuid } from '@ims/shared-kernel';

export async function getFacultyTrainerContext() {
  const session = await getSession();
  const { branchScopeResolver } = await import('../../lib/runtime');
  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(createUuid(session.userId), session.activeBranchId ? createUuid(session.activeBranchId) : null);

  return {
    session,
    authContext: {
      actorId: session.userId,
      branchId: session.activeBranchId,
      permissions: session.permissions,
      allowedBranchIds,
    },
  };
}
