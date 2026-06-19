import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="grid min-h-screen place-items-center px-4 py-10">{children}</div>;
}
