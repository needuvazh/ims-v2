import type { ReactNode } from 'react';
import { AppShell } from '@ims/shared-ui';
import { trainerNavigation } from '@ims/identity-access';

export default function TrainerProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell appName="IMS Trainer" branchName="Teaching scope" userName="Trainer" items={trainerNavigation}>
      {children}
    </AppShell>
  );
}
