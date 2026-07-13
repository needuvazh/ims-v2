'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../utils/cn';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

function SheetOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(16,36,58,0.4)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'left' | 'right' | 'top' | 'bottom';
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 gap-4 bg-[color:var(--ims-surface)] p-6 shadow-[0_20px_60px_rgba(17,24,39,0.18)] transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 overflow-y-auto',
          side === 'right' && 'inset-y-0 right-0 h-full w-full border-l border-[color:var(--ims-border)] sm:max-w-md md:max-w-lg data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          side === 'left' && 'inset-y-0 left-0 h-full w-full border-r border-[color:var(--ims-border)] sm:max-w-md md:max-w-lg data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'top' && 'inset-x-0 top-0 border-b border-[color:var(--ims-border)] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          side === 'bottom' && 'inset-x-0 bottom-0 border-t border-[color:var(--ims-border)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className
        )}
        {...props}
      >
        {children}
        <SheetClose className="absolute right-4 top-4 rounded-full p-1.5 text-[color:var(--ims-muted)] opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)] focus-visible:ring-offset-2 bg-[color:var(--ims-background)]">
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-6 flex flex-col gap-1.5', className)} {...props} />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        'font-[family-name:var(--font-display,serif)] text-xl font-semibold text-[color:var(--ims-ink)]',
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-[color:var(--ims-muted)]', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
