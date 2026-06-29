import { describe, expect, it } from 'vitest';
import { createDemoSession } from '@ims/shared-auth';
import { resolvePortalNavigation, resolvePortalShellUser } from './navigation-service';

describe('navigation service', () => {
  it('filters nav by permissions and resolves user labels', () => {
    const session = createDemoSession('44444444-4444-4444-4444-444444444444');

    expect(resolvePortalNavigation('admin', session).map((item) => item.href)).toContain('/organization');
    expect(resolvePortalNavigation('admin', session).map((item) => item.href)).toContain('/iam');
    expect(resolvePortalShellUser(session).userName).toBe('IMS Admin');
  });
});
