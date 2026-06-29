import type { ReactNode } from 'react';
import { AppShell } from '@ims/shared-ui';
import { trainerNavigation } from '@ims/identity-access';
import { LayoutDashboard, Calendar, ClipboardCheck } from 'lucide-react';

export default function TrainerProtectedLayout({ children }: { children: ReactNode }) {
  const nav = trainerNavigation.map((item) => {
    if (item.href === '/dashboard') {
      return { ...item, icon: <LayoutDashboard className="h-4.5 w-4.5" /> };
    }
    if (item.href === '/schedule') {
      return { ...item, icon: <Calendar className="h-4.5 w-4.5" /> };
    }
    if (item.href === '/attendance') {
      return { ...item, icon: <ClipboardCheck className="h-4.5 w-4.5" /> };
    }
    return item;
  });

  return (
    <AppShell appName="IMS Trainer" branchName="Teaching scope" userName="Trainer" items={nav}>
      {children}
    </AppShell>
  );
}
