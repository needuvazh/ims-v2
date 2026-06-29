'use client';

import React from 'react';
import { useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const alertVariants = cva(
  'relative flex items-start gap-3 rounded-2xl border p-4 text-sm',
  {
    variants: {
      variant: {
        info: 'border-[color:var(--ims-info-border)] bg-[color:var(--ims-info-bg)] text-[color:var(--ims-info)]',
        success: 'border-[color:var(--ims-success-border)] bg-[color:var(--ims-success-bg)] text-[color:var(--ims-success)]',
        warning: 'border-[color:var(--ims-warning-border)] bg-[color:var(--ims-warning-bg)] text-[color:var(--ims-warning)]',
        error: 'border-[color:var(--ims-error-border)] bg-[color:var(--ims-error-bg)] text-[color:var(--ims-error)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const iconMap: Record<string, ReactNode> = {
  info: <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
  success: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
  warning: <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
  error: <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />,
};

export interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  icon?: ReactNode;
  dismissible?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Alert({
  variant = 'info',
  title,
  description,
  icon,
  dismissible = false,
  className,
  children,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
    >
      {icon ?? iconMap[variant ?? 'info']}
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {description && <p className="opacity-90">{description}</p>}
        {children}
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss alert"
          className="ml-auto shrink-0 rounded-full p-0.5 opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
