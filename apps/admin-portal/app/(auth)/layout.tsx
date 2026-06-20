import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="grid min-h-screen place-items-center px-0 py-0">{children}</div>;
}
