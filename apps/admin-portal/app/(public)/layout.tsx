import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,125,70,0.14),_transparent_28%),linear-gradient(180deg,_#f4efe6_0%,_#fbf8f2_100%)]">
      {children}
    </div>
  );
}
