import { describe, expect, it } from 'vitest';
import {
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
    expect(isPathActive('/identity/users', '/organization')).toBe(false);
  });

  it('opens every menu group by default', () => {
    const items: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard' },
      {
        href: '/organization',
        label: 'Organization',
        items: [{ href: '/organization/branches', label: 'Branches' }],
      },
    ];

    expect(getInitialExpandedItems(items)).toEqual({ '/organization': true });
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
