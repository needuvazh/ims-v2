import type { Uuid } from '@ims/shared-kernel';

export interface IPermissionCachePort {
  getPermissionsForRole(roleCode: string): Promise<string[] | null>;
  setPermissionsForRole(roleCode: string, permissions: string[]): Promise<void>;
  invalidateRole(roleCode: string): Promise<void>;
  invalidateAll(): Promise<void>;
}

export class InMemoryPermissionCache implements IPermissionCachePort {
  private cache = new Map<string, { perms: string[]; expiresAt: number }>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  async getPermissionsForRole(roleCode: string): Promise<string[] | null> {
    const entry = this.cache.get(roleCode);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(roleCode);
      return null;
    }

    return entry.perms;
  }

  async setPermissionsForRole(roleCode: string, permissions: string[]): Promise<void> {
    this.cache.set(roleCode, {
      perms: permissions,
      expiresAt: Date.now() + this.TTL,
    });
  }

  async invalidateRole(roleCode: string): Promise<void> {
    this.cache.delete(roleCode);
  }

  async invalidateAll(): Promise<void> {
    this.cache.clear();
  }
}

export class NoOpPermissionCache implements IPermissionCachePort {
  async getPermissionsForRole(_roleCode: string): Promise<string[] | null> {
    return null;
  }

  async setPermissionsForRole(_roleCode: string, _permissions: string[]): Promise<void> {
    return;
  }

  async invalidateRole(_roleCode: string): Promise<void> {
    return;
  }

  async invalidateAll(): Promise<void> {
    return;
  }
}
