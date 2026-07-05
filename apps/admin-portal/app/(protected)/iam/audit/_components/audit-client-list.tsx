'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileSliders, Search, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  EmptyState,
  FormLabel,
  Input,
  Pagination,
  ResponsiveDataTable,
  Select,
} from '@ims/shared-ui';
import { AuditDetailsButton } from './audit-details-button';

type SortOrder = 'asc' | 'desc';

interface AuditLogItem {
  id: string;
  performedAt: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string | null;
  branchId: string | null;
  reason: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

interface AuditClientListProps {
  auditLogs: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  initialAction: string;
  initialEntityType: string;
  initialEntityId: string;
  initialPerformerId: string;
  initialModule: string;
  initialStartDate: string;
  initialEndDate: string;
  initialSortBy: string;
  initialSortOrder: SortOrder;
}

const MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'iam', label: 'IAM' },
  { value: 'organization', label: 'Organization' },
  { value: 'finance', label: 'Finance' },
  { value: 'courses-batches', label: 'Courses & Batches' },
  { value: 'crm-leads', label: 'CRM / Leads' },
  { value: 'admissions-enrollment', label: 'Admissions & Enrollment' },
  { value: 'attendance', label: 'Attendance' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return collator.compare(a ?? '', b ?? '');
}

export function AuditClientList({
  auditLogs,
  total,
  page,
  pageSize,
  totalPages,
  initialAction,
  initialEntityType,
  initialEntityId,
  initialPerformerId,
  initialModule,
  initialStartDate,
  initialEndDate,
  initialSortBy,
  initialSortOrder,
}: AuditClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get('sortBy') ?? initialSortBy ?? 'performedAt';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? initialSortOrder;

  const currentAction = searchParams.get('action') ?? initialAction ?? '';
  const currentEntityType = searchParams.get('entityType') ?? initialEntityType ?? '';
  const currentEntityId = searchParams.get('entityId') ?? initialEntityId ?? '';
  const currentPerformerId = searchParams.get('performerId') ?? initialPerformerId ?? '';
  const currentModule = searchParams.get('module') ?? initialModule ?? '';
  const currentStartDate = searchParams.get('startDate') ?? initialStartDate ?? '';
  const currentEndDate = searchParams.get('endDate') ?? initialEndDate ?? '';
  const currentPageSize = searchParams.get('pageSize') ?? String(pageSize);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const handleSort = (field: string) => {
    const nextOrder: SortOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const sortedLogs = useMemo(() => {
    return [...auditLogs].sort((left, right) => {
      const direction = currentSortOrder === 'asc' ? 1 : -1;

      switch (currentSortBy) {
        case 'module':
          return compareText(left.module, right.module) * direction;
        case 'action':
          return compareText(left.action, right.action) * direction;
        case 'entityType':
          return compareText(left.entityType, right.entityType) * direction;
        case 'performedBy':
          return compareText(left.performedBy, right.performedBy) * direction;
        case 'branchId':
          return compareText(left.branchId, right.branchId) * direction;
        case 'performedAt':
        default:
          return (new Date(left.performedAt).getTime() - new Date(right.performedAt).getTime()) * direction;
      }
    });
  }, [auditLogs, currentSortBy, currentSortOrder]);

  const columns = [
    {
      header: 'Time',
      sortable: true,
      sortDirection: currentSortBy === 'performedAt' ? currentSortOrder : null,
      onSort: () => handleSort('performedAt'),
      render: (item: AuditLogItem) => <span className="whitespace-nowrap text-sm text-slate-600">{new Date(item.performedAt).toLocaleString()}</span>,
      headerClassName: 'w-[170px]',
    },
    {
      header: 'Module',
      sortable: true,
      sortDirection: currentSortBy === 'module' ? currentSortOrder : null,
      onSort: () => handleSort('module'),
      render: (item: AuditLogItem) => <span className="capitalize text-xs font-semibold text-slate-700">{item.module}</span>,
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Action',
      sortable: true,
      sortDirection: currentSortBy === 'action' ? currentSortOrder : null,
      onSort: () => handleSort('action'),
      render: (item: AuditLogItem) => <span className="font-mono text-xs text-slate-600">{item.action}</span>,
    },
    {
      header: 'Entity',
      sortable: true,
      sortDirection: currentSortBy === 'entityType' ? currentSortOrder : null,
      onSort: () => handleSort('entityType'),
      render: (item: AuditLogItem) => (
        <span className="font-mono text-xs text-slate-600 truncate max-w-[180px]" title={`${item.entityType}:${item.entityId}`}>
          {item.entityType}:{item.entityId.substring(0, 8)}...
        </span>
      ),
    },
    {
      header: 'Performed By',
      sortable: true,
      sortDirection: currentSortBy === 'performedBy' ? currentSortOrder : null,
      onSort: () => handleSort('performedBy'),
      render: (item: AuditLogItem) =>
        item.performedBy ? (
          <Link href={`/iam/users/${item.performedBy}`} className="font-semibold text-[var(--ims-primary)] hover:underline">
            {item.performedBy.substring(0, 8)}...
          </Link>
        ) : (
          <span className="text-sm text-slate-500">System</span>
        ),
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branchId' ? currentSortOrder : null,
      onSort: () => handleSort('branchId'),
      render: (item: AuditLogItem) => (
        <span className="text-sm text-slate-600">{item.branchId ? `Branch (${item.branchId.substring(0, 8)})` : 'All Branches'}</span>
      ),
    },
    {
      header: 'Reason',
      render: (item: AuditLogItem) => (
        <span className="max-w-[200px] truncate text-sm text-slate-600" title={item.reason ?? ''}>
          {item.reason ?? '—'}
        </span>
      ),
    },
    {
      header: 'Details',
      className: 'text-center',
      render: (item: AuditLogItem) => <AuditDetailsButton item={item} />,
      headerClassName: 'w-[90px] text-center',
    },
  ];

  const renderCard = (item: AuditLogItem) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">{new Date(item.performedAt).toLocaleString()}</p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">{item.action}</p>
          </div>
          <Badge variant="outline">{item.module}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Entity</p>
            <p className="truncate">{item.entityType}:{item.entityId.substring(0, 8)}...</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Performed By</p>
            <p className="truncate">{item.performedBy ? item.performedBy.substring(0, 8) + '...' : 'System'}</p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{item.branchId ? `Branch (${item.branchId.substring(0, 8)})` : 'All Branches'}</p>
          </div>
          <div className="col-span-2">
            <p className="font-semibold text-[var(--ims-muted)]">Reason</p>
            <p className="line-clamp-3 text-slate-600">{item.reason ?? '—'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <AuditDetailsButton item={item} />
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <FileSliders className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Audit Trail
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Track and inspect system-wide audit events and changes.
          </p>
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Action
          </FormLabel>
          <Input
            name="action"
            value={currentAction}
            onChange={(e) => updateParams({ action: e.target.value || null, page: '1' })}
            placeholder="e.g. iam.user.create"
            className="h-12"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Entity Type
          </FormLabel>
          <Input
            name="entityType"
            value={currentEntityType}
            onChange={(e) => updateParams({ entityType: e.target.value || null, page: '1' })}
            placeholder="e.g. User"
            className="h-12"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Module
          </FormLabel>
          <Select
            value={currentModule}
            onChange={(e) => updateParams({ module: e.target.value || null, page: '1' })}
            options={MODULE_OPTIONS}
            className="h-12"
            placeholder="All Modules"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Date Range
          </FormLabel>
          <div className="flex gap-2">
            <Input
              name="startDate"
              type="date"
              value={currentStartDate}
              onChange={(e) => updateParams({ startDate: e.target.value || null, page: '1' })}
              className="h-12 flex-1"
            />
            <Input
              name="endDate"
              type="date"
              value={currentEndDate}
              onChange={(e) => updateParams({ endDate: e.target.value || null, page: '1' })}
              className="h-12 flex-1"
            />
          </div>
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Performer ID
          </FormLabel>
          <Input
            name="performerId"
            value={currentPerformerId}
            onChange={(e) => updateParams({ performerId: e.target.value || null, page: '1' })}
            placeholder="UUID"
            className="h-12"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Entity ID
          </FormLabel>
          <Input
            name="entityId"
            value={currentEntityId}
            onChange={(e) => updateParams({ entityId: e.target.value || null, page: '1' })}
            placeholder="UUID"
            className="h-12"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Page Size
          </FormLabel>
          <Select
            value={currentPageSize}
            onChange={(e) => updateParams({ pageSize: e.target.value || null, page: '1' })}
            options={PAGE_SIZE_OPTIONS}
            className="h-12"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button
            type="button"
            onClick={() => {
              updateParams({
                action: null,
                entityType: null,
                entityId: null,
                performerId: null,
                module: null,
                startDate: null,
                endDate: null,
                page: '1',
              });
            }}
            variant="outline"
            className="h-12 flex-1"
          >
            Reset
          </Button>
        </div>
      </form>

      {total === 0 ? (
        <EmptyState
          icon={<FileSliders className="h-6 w-6" />}
          title="No audit logs found"
          description="No audit logs match the current filter criteria."
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase text-[color:var(--ims-muted)]">
              <FileSliders className="h-4 w-4" />
              {total} audit event(s) · Page {page} of {totalPages}
            </h3>
          </div>

          <ResponsiveDataTable
            data={sortedLogs}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(item) => item.id}
            emptyState={null}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={total}
            limit={pageSize}
          />
        </>
      )}
    </div>
  );
}
