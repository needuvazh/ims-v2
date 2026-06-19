import { describe, expect, it } from 'vitest';
import { createDemoSession } from './session';
import { hasPermission, hasRole } from './permissions';

describe('shared auth permissions', () => {
  it('detects permissions and roles from the session', () => {
    const session = createDemoSession('22222222-2222-2222-2222-222222222222');

    expect(hasPermission(session, 'organization.manage')).toBe(true);
    expect(hasRole(session, 'Admin')).toBe(true);
    expect(hasPermission(session, 'finance.manage')).toBe(false);
  });
});
