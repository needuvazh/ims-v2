import type { Session } from './session';

export function hasPermission(session: Session | null, permission: string): boolean {
  if (!session) {
    return false;
  }

  return session.permissions.includes(permission);
}

export function hasAnyPermission(session: Session | null, permissions: readonly string[]): boolean {
  return permissions.some((permission) => hasPermission(session, permission));
}

export function hasRole(session: Session | null, role: string): boolean {
  return Boolean(session?.roles.includes(role));
}
