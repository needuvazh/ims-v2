'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Compass, Eye, Pencil, Search, User, UserCheck, X } from 'lucide-react';
import type { LeadSortField } from '@ims/crm-leads';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormControl,
  FormField,
  FormLabel,
  Input,
  Pagination,
  ResponsiveDataTable,
  Select,
  SimpleTooltip,
} from '@ims/shared-ui';


interface LeadsClientListProps {
  leads: any[];
  branches: any[];
  total: number;
}

type SortOrder = 'asc' | 'desc';

export function LeadsClientList({
  leads,
  branches,
  total,
}: LeadsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page')
    ? parseInt(searchParams.get('page')!, 10)
    : 1;
  const totalPages = Math.ceil(total / 10);

  const currentSortBy =
    (searchParams.get('sortBy') as LeadSortField | null) ?? 'createdAt';
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc';

  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const [nationalIdValue, setNationalIdValue] = useState(
    searchParams.get('nationalId') || '',
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearchValue((current) =>
      current === nextSearch ? current : nextSearch,
    );
  }, [searchParams]);

  useEffect(() => {
    const nextNationalId = searchParams.get('nationalId') || '';
    setNationalIdValue((current) =>
      current === nextNationalId ? current : nextNationalId,
    );
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get('q') || '';
    if (searchValue === currentSearch) {
      return;
    }

    const timeout = setTimeout(() => {
      updateParams({ q: searchValue || null, page: '1' });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  useEffect(() => {
    const currentNationalId = searchParams.get('nationalId') || '';
    if (nationalIdValue === currentNationalId) {
      return;
    }

    const timeout = setTimeout(() => {
      updateParams({ nationalId: nationalIdValue || null, page: '1' });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchParams, nationalIdValue, updateParams]);

  const handleSort = (field: LeadSortField) => {
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'New':
        return 'default';
      case 'FollowUp':
        return 'info';
      case 'Won':
        return 'success';
      case 'Lost':
        return 'error';
      case 'Converted':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return 'N/A';
    const date = typeof value === 'string' ? new Date(value) : value;

    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const columns = [
    {
      header: 'Lead Number',
      sortable: true,
      sortDirection: currentSortBy === 'leadNumber' ? currentSortOrder : null,
      onSort: () => handleSort('leadNumber'),
      render: (lead: any) => (
        <span className="font-mono text-xs font-semibold tracking-wider text-[color:var(--ims-muted)]">
          {lead.leadNumber}
        </span>
      ),
    },
    {
      header: 'Name',
      sortable: true,
      sortDirection: currentSortBy === 'name' ? currentSortOrder : null,
      onSort: () => handleSort('name'),
      render: (lead: any) => (
        <span className="font-medium text-[color:var(--ims-ink)]">
          {lead.firstName} {lead.lastName}
        </span>
      ),
    },
    {
      header: 'ID Number',
      render: (lead: any) =>
        lead.nationalId || (
          <span className="text-xs italic text-[color:var(--ims-muted)]">
            N/A
          </span>
        ),
    },
    {
      header: 'Phone',
      sortable: true,
      sortDirection: currentSortBy === 'phone' ? currentSortOrder : null,
      onSort: () => handleSort('phone'),
      render: (lead: any) => lead.phone,
    },
    {
      header: 'Email',
      sortable: true,
      sortDirection: currentSortBy === 'email' ? currentSortOrder : null,
      onSort: () => handleSort('email'),
      render: (lead: any) =>
        lead.email || (
          <span className="text-xs italic text-[color:var(--ims-muted)]">
            N/A
          </span>
        ),
    },
    {
      header: 'Branch',
      sortable: true,
      sortDirection: currentSortBy === 'branch' ? currentSortOrder : null,
      onSort: () => handleSort('branch'),
      render: (lead: any) => lead.branch?.name || 'N/A',
    },
    {
      header: 'Course',
      render: (lead: any) =>
        lead.interestedCourse?.nameEnglish || lead.interestedCourseId,
    },
    {
      header: 'Stage',
      sortable: true,
      sortDirection: currentSortBy === 'stage' ? currentSortOrder : null,
      onSort: () => handleSort('stage'),
      render: (lead: any) => (
        <Badge variant={getStageBadgeVariant(lead.stage)}>{lead.stage}</Badge>
      ),
    },
    {
      header: 'Date & Time',
      sortable: true,
      sortDirection: currentSortBy === 'createdAt' ? currentSortOrder : null,
      onSort: () => handleSort('createdAt'),
      render: (lead: any) => (
        <span className="whitespace-nowrap text-xs text-[color:var(--ims-muted)]">
          {formatDateTime(lead.createdAt)}
        </span>
      ),
    },
    {
      header: 'Updated',
      sortable: true,
      sortDirection: currentSortBy === 'updatedAt' ? currentSortOrder : null,
      onSort: () => handleSort('updatedAt'),
      render: (lead: any) => (
        <span className="whitespace-nowrap text-xs text-[color:var(--ims-muted)]">
          {formatDateTime(lead.updatedAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (lead: any) => (
        <div className="flex items-center justify-end gap-2">
          <SimpleTooltip content="View Details">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 flex items-center justify-center"
              onClick={() => router.push(`/leads/${lead.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </SimpleTooltip>

          {lead.stage !== 'Converted' && (
            <SimpleTooltip content="Edit Details">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 flex items-center justify-center"
                onClick={() => router.push(`/leads/${lead.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </SimpleTooltip>
          )}
        </div>
      ),
    },
  ];

  const renderCard = (lead: any) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {lead.leadNumber}
            </p>
            <p className="truncate text-sm font-bold text-[var(--ims-ink)]">
              {lead.firstName} {lead.lastName}
            </p>
          </div>
          <Badge variant={getStageBadgeVariant(lead.stage)}>{lead.stage}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Phone</p>
            <p className="truncate">{lead.phone}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">ID Number</p>
            <p className="truncate">{lead.nationalId || 'N/A'}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Email</p>
            <p className="truncate">{lead.email || 'N/A'}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{lead.branch?.name || 'N/A'}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Course</p>
            <p className="truncate">
              {lead.interestedCourse?.nameEnglish || lead.interestedCourseId}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Created</p>
            <p className="text-[11px] leading-5 text-[color:var(--ims-ink)]">
              {formatDateTime(lead.createdAt)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Updated</p>
            <p className="text-[11px] leading-5 text-[color:var(--ims-ink)]">
              {formatDateTime(lead.updatedAt)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[11px]"
          onClick={() => router.push(`/leads/${lead.id}`)}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" /> View
        </Button>
        {lead.stage !== 'Converted' && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[11px]"
            onClick={() => router.push(`/leads/${lead.id}/edit`)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  const filterRow = [
    {
      key: 'branchId',
      label: 'Branch',
      options: branches.map((b) => ({ value: b.id, label: b.name })),
    },
    {
      key: 'stage',
      label: 'Stage',
      options: [
        { value: 'New', label: 'New' },
        { value: 'FollowUp', label: 'Follow-up' },
        { value: 'Won', label: 'Won' },
        { value: 'Lost', label: 'Lost' },
        { value: 'Converted', label: 'Converted' },
      ],
    },
    {
      key: 'source',
      label: 'Source',
      options: [
        { value: 'WalkIn', label: 'Walk-in' },
        { value: 'Web', label: 'Website' },
        { value: 'Referral', label: 'Referral' },
        { value: 'Campaign', label: 'Campaign' },
        { value: 'Other', label: 'Other' },
        { value: 'Phone', label: 'Phone' },
        { value: 'WhatsApp', label: 'WhatsApp' },
        { value: 'Facebook', label: 'Facebook' },
        { value: 'Instagram', label: 'Instagram' },
        { value: 'GoogleAds', label: 'Google Ads' },
        { value: 'CorporateReferral', label: 'Corporate Referral' },
      ],
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <header className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <Compass className="h-6 w-6 shrink-0 text-[color:var(--ims-brass)] sm:h-8 sm:w-8" />
            Leads
          </h1>
        </div>

        <Button
          className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4"
          onClick={() => router.push('/leads/create')}
        >
          <User className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Create Lead</span>
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              placeholder="Search leads by name, phone, email, or ID..."
              leftIcon={<Search className="h-4 w-4" />}
              className="h-12 pr-10"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  updateParams({ q: null, page: '1' });
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ID Number Filter */}
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            ID Number
          </FormLabel>
          <div className="relative">
            <Input
              value={nationalIdValue}
              onChange={(e) => {
                setNationalIdValue(e.target.value);
              }}
              placeholder="Filter by ID..."
              className="h-12 pr-10"
            />
            {nationalIdValue && (
              <button
                type="button"
                onClick={() => {
                  setNationalIdValue('');
                  updateParams({ nationalId: null, page: '1' });
                }}
                aria-label="Clear ID filter"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-[color:var(--ims-muted)] transition-colors hover:text-[color:var(--ims-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ims-brass)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {filterRow.map((filter) => (
          <div key={filter.key} className="min-w-0">
            <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
              {filter.label}
            </FormLabel>
            <Select
              value={searchParams.get(filter.key) || ''}
              onChange={(e) =>
                updateParams({ [filter.key]: e.target.value, page: '1' })
              }
              options={[{ value: '', label: 'All' }, ...filter.options]}
              className="h-12"
              placeholder={`All ${filter.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      <ResponsiveDataTable
        data={leads}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(lead) => lead.id}
        emptyState={
          <EmptyState
            icon={<User className="h-6 w-6" />}
            title="No leads found"
            description="No active leads match your current filter criteria."
          />
        }
      />

      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={total}
          limit={10}
        />
      )}

    </div>
  );
}
