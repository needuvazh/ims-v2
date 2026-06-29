import { assertPermission } from '@/lib/auth-guard';

export async function loadUserProfile(userId: string) {
  await assertPermission('iam.user.read');
  const { userService } = await import('@/lib/runtime');
  
  const userDetails = await userService.getUser(userId);
  const roles = await userService.listRolesForUser(userId);
  
  return {
    ...userDetails,
    roleIds: roles.map(r => r.id),
  };
}
