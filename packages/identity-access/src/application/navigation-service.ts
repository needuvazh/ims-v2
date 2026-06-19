import type { Session } from '@ims/shared-auth';
import { hasPermission, hasRole } from '@ims/shared-auth';
import type { NavigationItem } from '../domain/access';
import { adminNavigation, studentNavigation, trainerNavigation } from '../domain/access';

type Portal = 'admin' | 'student' | 'trainer';

export function resolvePortalNavigation(portal: Portal, session: Session | null): NavigationItem[] {
  const items =
    portal === 'admin' ? adminNavigation : portal === 'student' ? studentNavigation : trainerNavigation;

  return items.filter((item) => !item.permission || hasPermission(session, item.permission));
}

export function resolvePortalShellUser(session: Session | null) {
  if (!session) {
    return {
      userName: 'Guest',
      roleName: 'Anonymous',
    };
  }

  return {
    userName: session.displayName,
    roleName: hasRole(session, 'Admin')
      ? 'Admin'
      : hasRole(session, 'Trainer')
        ? 'Trainer'
        : 'Student',
  };
}
