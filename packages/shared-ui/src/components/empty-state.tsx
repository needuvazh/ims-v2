import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Card } from './card';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Server-compatible empty state component. */
export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <Card
      className={cn('flex flex-col items-center border-dashed py-12 text-center', className)}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--ims-brass-soft)] text-[color:var(--ims-brass)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[color:var(--ims-ink)]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-[color:var(--ims-muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
