import { describe, expect, it } from 'vitest';
import { createDemoSession } from './session';
import { isAuthorizedForBranch, getAuthorizedBranchIds, isGlobalScope } from './scopes';
import type { Session } from './session';

describe('scopes utilities', () => {
  it('identifies global scope correctly', () => {
    const session = createDemoSession('123');
    expect(isGlobalScope(session)).toBe(true);
    expect(getAuthorizedBranchIds(session)).toBeNull();
    expect(isAuthorizedForBranch(session, 'some-branch-uuid')).toBe(true);
  });

  it('filters branch scopes correctly', () => {
    const session: Session = {
      userId: '123',
      displayName: 'Test User',
      roles: ['Manager'],
      permissions: [],
      dataScopes: [
        { scopeType: 'Branch', branchId: 'branch-1', departmentId: null, assignedOnly: false },
        { scopeType: 'Branch', branchId: 'branch-2', departmentId: null, assignedOnly: false }
      ],
      activeBranchId: 'branch-1',
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    expect(isGlobalScope(session)).toBe(false);
    expect(getAuthorizedBranchIds(session)).toEqual(['branch-1', 'branch-2']);
    expect(isAuthorizedForBranch(session, 'branch-1')).toBe(true);
    expect(isAuthorizedForBranch(session, 'branch-3')).toBe(false);
  });

  it('enforces requireFullAccess and handles department scope correctly', () => {
    const session: Session = {
      userId: '123',
      displayName: 'Test User',
      roles: ['Counselor'],
      permissions: [],
      dataScopes: [
        { scopeType: 'Branch', branchId: 'branch-1', departmentId: null, assignedOnly: true },
        { scopeType: 'Department', branchId: 'branch-2', departmentId: 'dept-1', assignedOnly: false }
      ],
      activeBranchId: 'branch-1',
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    // Branch 1 has assignedOnly = true:
    // Should be unauthorized for full access (default)
    expect(isAuthorizedForBranch(session, 'branch-1')).toBe(false);
    // Should be authorized when full access is not required
    expect(isAuthorizedForBranch(session, 'branch-1', { requireFullAccess: false })).toBe(true);

    // Branch 2 has Department scope:
    // Should be unauthorized for full access (default)
    expect(isAuthorizedForBranch(session, 'branch-2')).toBe(false);
    // Should be authorized when full access is not required
    expect(isAuthorizedForBranch(session, 'branch-2', { requireFullAccess: false })).toBe(true);
  });
});

