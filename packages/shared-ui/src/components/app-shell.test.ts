import { describe, expect, it } from 'vitest';
import {
  groupNavigationSections,
  getInitialExpandedItems,
  getNavigationTrail,
  isPathActive,
  type NavItem,
} from './app-shell';

describe('sidebar navigation helpers', () => {
  it('treats child routes as active for their parent menu', () => {
    expect(isPathActive('/organization/branches', '/organization')).toBe(true);
    expect(isPathActive('/organization/branches/123', '/organization/branches')).toBe(true);
  });

  it('does not mark unrelated routes active', () => {
    expect(isPathActive('/iam/users', '/organization')).toBe(false);
  });

  it('groups items by category and preserves order', () => {
    const items: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard', category: 'Overview' },
      { href: '/organization', label: 'Organization', category: 'Management' },
      { href: '/iam', label: 'IAM', category: 'Management' },
    ];

    expect(groupNavigationSections(items)).toEqual([
      { label: 'Overview', items: [items[0]] },
      { label: 'Management', items: [items[1], items[2]] },
    ]);
  });

  it('opens only the active branch by default', () => {
    const items: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard' },
      {
        href: '/organization',
        label: 'Organization',
        items: [
          { href: '/organization/branches', label: 'Branches' },
          { href: '/organization/departments', label: 'Departments' },
        ],
      },
    ];

    expect(getInitialExpandedItems(items, '/organization/branches')).toEqual({ '/organization': true });
  });

  it('builds the active navigation trail for nested routes', () => {
    const items: NavItem[] = [
      {
        href: '/organization',
        label: 'Organization',
        items: [
          { href: '/organization/branches', label: 'Branches' },
          { href: '/organization/departments', label: 'Departments' },
        ],
      },
    ];

    expect(getNavigationTrail(items, '/organization/branches')).toEqual([
      items[0],
      items[0].items![0],
    ]);
  });
});
