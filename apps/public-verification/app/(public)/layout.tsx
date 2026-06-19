import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(155,106,68,0.14),_transparent_30%),linear-gradient(180deg,_#f7f1e6_0%,_#fcfaf6_100%)]">{children}</div>;
}
