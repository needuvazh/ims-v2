import { assertPermission } from '../../lib/auth-guard';

export async function loadIdentityData() {
  await assertPermission('identity.read');
  const { userService, roleService } = await import('../../lib/runtime');
  const [users, roles, permissions] = await Promise.all([
    userService.listUsers(),
    roleService.listRoles(),
    roleService.listPermissions(),
  ]);

  return { users, roles, permissions };
}
