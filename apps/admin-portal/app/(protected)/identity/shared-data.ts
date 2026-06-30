import { assertPermission, getSession } from '../../lib/auth-guard';

export async function loadIdentityData() {
  const session = await assertPermission('iam.user.read');
  const { userService, roleService, organizationService, branchScopeResolver } = await import('../../lib/runtime');
  
  const context = {
    actorId: session.userId,
    actorPermissions: session.permissions,
    activeBranchId: session.activeBranchId,
  };

  const [users, roles, permissions] = await Promise.all([
    userService.listUsers(context),
    roleService.listRoles(),
    roleService.listPermissions(),
  ]);
  const branchResult = await organizationService.listBranches({ pageSize: 1000 });

  const allowedBranchIds = await branchScopeResolver.resolveAllowedBranches(session.userId as any, session.activeBranchId as any);
  const branches = allowedBranchIds.length === 0
    ? branchResult.items
    : branchResult.items.filter((b) => allowedBranchIds.includes(b.id as any));

  return { users, roles, permissions, branches };
}
