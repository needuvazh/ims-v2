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
import { convertLeadAction } from '../actions';

interface LeadsClientListProps {
  leads: any[];
  branches: any[];
  total: number;
}

type SortOrder = 'asc' | 'desc';

export function LeadsClientList({ leads, branches, total }: LeadsClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
  const totalPages = Math.ceil(total / 10);

  const currentSortBy = (searchParams.get('sortBy') as LeadSortField | null) ?? 'createdAt';
  const currentSortOrder = (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc';

  const [convertingLead, setConvertingLead] = useState<any | null>(null);
  const [docLink1, setDocLink1] = useState('');
  const [docLink2, setDocLink2] = useState('');
  const [docError, setDocError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

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

  useEffect(() => {
    const nextSearch = searchParams.get('q') || '';
    setSearchValue((current) => (current === nextSearch ? current : nextSearch));
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

  const handleSort = (field: LeadSortField) => {
    const nextOrder: SortOrder = currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
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

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);

    if (!docLink1.trim()) {
      setDocError('At least one identity document URL (e.g. National ID scan link) is mandatory.');
      return;
    }

    try {
      setIsConverting(true);
      const links = [docLink1.trim()];
      if (docLink2.trim()) {
        links.push(docLink2.trim());
      }

      const response = await convertLeadAction(convertingLead.id, links);
      const res = response as any;
      if (res && !res.success) {
        setDocError(res.error || 'Conversion failed. Make sure lead has valid DOB and Email.');
      } else {
        toast.success('Lead converted to student successfully!');
        setConvertingLead(null);
        setDocLink1('');
        setDocLink2('');
        router.refresh();
      }
    } catch (err: any) {
      setDocError(err.message || 'An unexpected conversion error occurred.');
    } finally {
      setIsConverting(false);
    }
  };

  const columns = [
    {
      header: 'Lead Number',
      sortable: true,
      sortDirection: currentSortBy === 'leadNumber' ? currentSortOrder : null,
      onSort: () => handleSort('leadNumber'),
      render: (lead: any) => <span className="font-mono text-xs font-semibold tracking-wider text-[color:var(--ims-muted)]">{lead.leadNumber}</span>,
    },
    {
      header: 'Name',
      sortable: true,
      sortDirection: currentSortBy === 'name' ? currentSortOrder : null,
      onSort: () => handleSort('name'),
      render: (lead: any) => <span className="font-medium text-[color:var(--ims-ink)]">{lead.firstName} {lead.lastName}</span>,
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
      render: (lead: any) => lead.email || <span className="text-xs italic text-[color:var(--ims-muted)]">N/A</span>,
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
      render: (lead: any) => lead.interestedCourse?.nameEnglish || lead.interestedCourseId,
    },
    {
      header: 'Stage',
      sortable: true,
      sortDirection: currentSortBy === 'stage' ? currentSortOrder : null,
      onSort: () => handleSort('stage'),
      render: (lead: any) => <Badge variant={getStageBadgeVariant(lead.stage)}>{lead.stage}</Badge>,
    },
    {
      header: 'Created',
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

          <SimpleTooltip content="Edit Details">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 flex items-center justify-center"
              onClick={() => router.push(`/leads/${lead.id}/edit`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </SimpleTooltip>

          {lead.stage !== 'Converted' && (
            <SimpleTooltip content="Convert to Student">
              <Button
                className="h-8 w-8 p-0 flex items-center justify-center bg-[var(--ims-ink)] text-white hover:bg-[var(--ims-brass)]"
                onClick={() => setConvertingLead(lead)}
              >
                <UserCheck className="h-4 w-4" />
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
            <p className="font-semibold text-[var(--ims-muted)]">Branch</p>
            <p className="truncate">{lead.branch?.name || 'N/A'}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Email</p>
            <p className="truncate">{lead.email || 'N/A'}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Course</p>
            <p className="truncate">{lead.interestedCourse?.nameEnglish || lead.interestedCourseId}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Created</p>
            <p className="text-[11px] leading-5 text-[color:var(--ims-ink)]">{formatDateTime(lead.createdAt)}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Updated</p>
            <p className="text-[11px] leading-5 text-[color:var(--ims-ink)]">{formatDateTime(lead.updatedAt)}</p>
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
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[11px]"
          onClick={() => router.push(`/leads/${lead.id}/edit`)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        {lead.stage !== 'Converted' && (
          <Button
            size="sm"
            className="flex-1 bg-[var(--ims-ink)] text-[11px] text-white"
            onClick={() => setConvertingLead(lead)}
          >
            <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Convert
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
      <header className="flex flex-row items-center justify-between gap-3 rounded-3xl border border-[color:var(--ims-border)] bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--ims-accent-soft)] text-[color:var(--ims-brass)] shadow-[0_10px_28px_rgba(161,123,68,0.14)]">
              <Compass className="h-5 w-5" />
            </div>
            <h1 className="truncate text-page-title font-bold tracking-tight text-[var(--ims-ink)]">Leads</h1>
          </div>
        </div>

        <Button className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4" onClick={() => router.push('/leads/create')}>
          <User className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Create Lead</span>
        </Button>
      </header>

      <Card className="border-[color:var(--ims-border)] bg-white/80 shadow-sm">
        <CardContent className="p-4 sm:p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))]">
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
                  placeholder="Search leads by name, phone, or email..."
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

            {filterRow.map((filter) => (
              <div key={filter.key} className="min-w-0">
                <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
                  {filter.label}
                </FormLabel>
                <Select
                  value={searchParams.get(filter.key) || ''}
                  onChange={(e) => updateParams({ [filter.key]: e.target.value, page: '1' })}
                  options={[
                    { value: '', label: 'All' },
                    ...filter.options,
                  ]}
                  className="h-12"
                  placeholder={`All ${filter.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}

      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert Lead to Student</DialogTitle>
            <DialogDescription>
              To complete the admissions handoff, please upload or enter URL links for at least one identity document
              (e.g., Omani Civil ID scan, passport copy).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConvertSubmit} className="space-y-4 py-2">
            {docError && (
              <div className="rounded-lg border border-[color:var(--ims-error-border)] bg-red-50 p-3 text-xs text-[color:var(--ims-error)]">
                {docError}
              </div>
            )}

            <FormField>
              <FormLabel required>Identity Document URL (Civil ID Scan)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://storage.example.com/docs/civil_id.pdf"
                  value={docLink1}
                  onChange={(e) => setDocLink1(e.target.value)}
                  required
                />
              </FormControl>
              <span className="text-[10px] text-[color:var(--ims-muted)]">
                Civil ID scan or equivalent national registration document.
              </span>
            </FormField>

            <FormField>
              <FormLabel>Secondary Document URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://storage.example.com/docs/passport.pdf"
                  value={docLink2}
                  onChange={(e) => setDocLink2(e.target.value)}
                />
              </FormControl>
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConvertingLead(null)} disabled={isConverting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isConverting || !docLink1.trim()}>
                {isConverting ? 'Converting...' : 'Complete Admissions Handoff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
