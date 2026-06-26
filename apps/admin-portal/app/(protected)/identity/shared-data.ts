import { assertPermission } from '../../lib/auth-guard';

export async function loadIdentityData() {
  await assertPermission('identity.read');
  const { userService, roleService, organizationService } = await import('../../lib/runtime');
  const [users, roles, permissions] = await Promise.all([
    userService.listUsers(),
    roleService.listRoles(),
    roleService.listPermissions(),
  ]);
  const branchResult = await organizationService.listBranches({ pageSize: 1000 });

  return { users, roles, permissions, branches: branchResult.items };
}
