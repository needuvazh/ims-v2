import type { Uuid } from '@ims/shared-kernel';

export interface IPermissionCachePort {
  getEffectivePermissions(userId: Uuid): Promise<string[] | null>;
  invalidateUser(userId: Uuid): Promise<void>;
  invalidateRole(roleId: Uuid): Promise<void>;
}

export class NoOpPermissionCache implements IPermissionCachePort {
  async getEffectivePermissions(_userId: Uuid): Promise<string[] | null> {
    return null;
  }

  async invalidateUser(_userId: Uuid): Promise<void> {
    return;
  }

  async invalidateRole(_roleId: Uuid): Promise<void> {
    return;
  }
}
