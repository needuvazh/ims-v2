import { describe, expect, it } from 'vitest';
import { createDemoSession } from '@ims/shared-auth';
import { resolvePortalNavigation, resolvePortalShellUser } from './navigation-service';

describe('navigation service', () => {
  it('filters nav by permissions and resolves user labels', () => {
    const session = createDemoSession('44444444-4444-4444-4444-444444444444');

    const navItems = resolvePortalNavigation('admin', session);
    const hrefs = navItems.flatMap((item) => [item.href, ...(item.items?.map((sub) => sub.href) || [])]);
    expect(hrefs).toContain('/organization/institutes');
    expect(hrefs).toContain('/iam/users');
    expect(resolvePortalShellUser(session).userName).toBe('IMS Admin');
  });

  it('shows faculty navigation when the session has faculty permissions', () => {
    const session = {
      ...createDemoSession('44444444-4444-4444-4444-444444444444'),
      permissions: [
        ...createDemoSession('44444444-4444-4444-4444-444444444444').permissions,
        'menu.faculty',
        'menu.faculty.trainers',
        'menu.faculty.eligible-trainers',
        'menu.faculty.reports',
      ],
    };
    const navItems = resolvePortalNavigation('admin', session);
    const facultyItem = navItems.find((item) => item.href === '/faculty');

    expect(facultyItem).toBeDefined();
    expect(facultyItem?.items?.map((item) => item.href)).toEqual(
      expect.arrayContaining(['/faculty/dashboard', '/faculty/trainers', '/faculty/eligible-trainers', '/faculty/reports']),
    );
  });
});
