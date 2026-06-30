'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Button } from '@ims/shared-ui';
import { Eye } from 'lucide-react';

interface AuditDetailsButtonProps {
  item: {
    id: string;
    module: string;
    performedBy: string | null;
    performedAt: string | Date;
    entityType: string;
    entityId: string;
    action: string;
    oldValue: any;
    newValue: any;
    ipAddress: string | null;
    userAgent: string | null;
    branchId: string | null;
    correlationId: string | null;
    reason: string | null;
  };
}

export function AuditDetailsButton({ item }: AuditDetailsButtonProps) {
  const formatJson = (val: any) => {
    if (val === null || val === undefined) return 'None';
    try {
      if (typeof val === 'string') {
        const parsed = JSON.parse(val);
        return JSON.stringify(parsed, null, 2);
      }
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View details">
          <Eye className="h-4 w-4 text-[color:var(--ims-brass)]" />
          <span className="sr-only">View details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Audit Entry Details</DialogTitle>
          <DialogDescription>
            Detailed logs and payload metadata for this event.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm text-[color:var(--ims-ink)]">
          <div className="grid grid-cols-2 gap-4 border-b border-[color:var(--ims-border)] pb-4">
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Event ID
              </span>
              <span className="font-mono text-xs select-all">{item.id}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Performed At
              </span>
              <span>{new Date(item.performedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Action
              </span>
              <span className="font-mono text-xs">{item.action}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Module
              </span>
              <span className="capitalize">{item.module}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Entity
              </span>
              <span className="font-mono text-xs">{item.entityType}:{item.entityId}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Performed By
              </span>
              <span>{item.performedBy ?? 'System'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Branch ID
              </span>
              <span className="font-mono text-xs select-all">{item.branchId ?? 'All Branches'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Correlation ID
              </span>
              <span className="font-mono text-xs select-all">{item.correlationId ?? '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                IP Address
              </span>
              <span>{item.ipAddress ?? '—'}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                User Agent
              </span>
              <span className="truncate block font-mono text-xs" title={item.userAgent ?? ''}>{item.userAgent ?? '—'}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider">
                Reason
              </span>
              <span>{item.reason ?? '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider mb-1">
                Old Value
              </span>
              <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs overflow-auto max-h-64 font-mono font-normal">
                {formatJson(item.oldValue)}
              </pre>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[color:var(--ims-muted)] uppercase tracking-wider mb-1">
                New Value
              </span>
              <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs overflow-auto max-h-64 font-mono font-normal">
                {formatJson(item.newValue)}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
