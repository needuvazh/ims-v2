import type { PropsWithChildren } from 'react';
import { Card } from './card';

export function EmptyState({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <Card className="flex flex-col gap-4 border-dashed">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[color:var(--ims-ink)]">{title}</h3>
        <p className="max-w-xl text-sm leading-6 text-[color:var(--ims-muted)]">{description}</p>
      </div>
      {children}
    </Card>
  );
}
