import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

/** Layout wrapper for admin list/table pages. Uses compact density by default. */
export function AdminListPageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('space-y-section-gap', className)}>
      {children}
    </div>
  );
}

/** Layout wrapper for admin forms. Centers content and uses standard density. */
export function AdminFormPageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('space-y-section-gap max-w-5xl mx-auto', className)}>
      {children}
    </div>
  );
}

/** Layout wrapper for admin detail pages. */
export function AdminDetailPageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('space-y-section-gap', className)}>
      {children}
    </div>
  );
}

/** Layout wrapper for public site pages. Uses hero density. */
export function PublicLandingLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('space-y-hero-py', className)}>
      {children}
    </div>
  );
}
