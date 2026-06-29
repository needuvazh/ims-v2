import type { ReactNode } from 'react';
import { AppShell } from '@ims/shared-ui';
import { studentNavigation } from '@ims/identity-access';
import { Home, CreditCard, Award } from 'lucide-react';

export default function StudentProtectedLayout({ children }: { children: ReactNode }) {
  const nav = studentNavigation.map((item) => {
    if (item.href === '/dashboard') {
      return { ...item, icon: <Home className="h-4.5 w-4.5" /> };
    }
    if (item.href === '/fees') {
      return { ...item, icon: <CreditCard className="h-4.5 w-4.5" /> };
    }
    if (item.href === '/certificates') {
      return { ...item, icon: <Award className="h-4.5 w-4.5" /> };
    }
    return item;
  });

  return (
    <AppShell appName="IMS Student" branchName="Learner scope" userName="Student" items={nav}>
      {children}
    </AppShell>
  );
}
