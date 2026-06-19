import type { ReactNode } from 'react';
import { AppShell } from '@ims/shared-ui';
import { studentNavigation } from '@ims/identity-access';

export default function StudentProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell appName="IMS Student" branchName="Learner scope" userName="Student" items={studentNavigation}>
      {children}
    </AppShell>
  );
}
