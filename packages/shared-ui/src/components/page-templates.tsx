import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/** Layout wrapper for admin list/table pages. Uses compact density by default. */
export function AdminListPageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('mx-auto w-full space-y-4 sm:space-y-5 lg:space-y-6', className)}>
      {children}
    </div>
  );
}

/** Layout wrapper for admin forms. Centers content and uses standard density. */
export function AdminFormPageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl space-y-4 sm:space-y-5 lg:space-y-6', className)}>
      {children}
    </div>
  );
}

/** Layout wrapper for admin detail pages. */
export function AdminDetailPageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl space-y-4 sm:space-y-5 lg:space-y-6', className)}>
      {children}
    </div>
  );
}

/** Layout wrapper for public site pages. Uses hero density. */
export function PublicLandingLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('mx-auto w-full space-y-10 sm:space-y-14 lg:space-y-20', className)}>
      {children}
    </div>
  );
}
