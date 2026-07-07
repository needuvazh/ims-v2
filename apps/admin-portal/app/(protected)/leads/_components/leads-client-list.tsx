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
  const [requirements, setRequirements] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { url: string; fileName: string; id?: string }>>({});
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});

  // Fetch dynamic requirements and existing documents when a lead is selected for conversion
  useEffect(() => {
    if (!convertingLead) {
      setRequirements([]);
      setUploadedFiles({});
      setUploadingStates({});
      return;
    }

    const loadData = async () => {
      try {
        const reqsRes = await fetch(
          `/api/v1/documents/requirements?targetEntity=STUDENT&branchId=${convertingLead.branchId}&courseId=${convertingLead.interestedCourseId || ''}`
        );
        if (reqsRes.ok) {
          const result = await reqsRes.json();
          setRequirements(result.data || []);
        }

        const docsRes = await fetch(`/api/v1/documents?ownerId=${convertingLead.personId}&ownerType=Person`);
        if (docsRes.ok) {
          const result = await docsRes.json();
          const docs = result.data?.documents || [];
          const mapped: Record<string, { url: string; fileName: string; id?: string }> = {};
          for (const d of docs) {
            mapped[d.documentType] = { url: d.fileKey, fileName: d.fileName, id: d.id };
          }
          setUploadedFiles(mapped);
        }
      } catch (err) {
        console.error('Failed to load conversion checklist', err);
      }
    };

    loadData();
  }, [convertingLead]);

  const handleLeadDocUpload = async (documentType: string, file: File | undefined) => {
    if (!file || !convertingLead) return;

    setUploadingStates((prev) => ({ ...prev, [documentType]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerId', convertingLead.personId);
      formData.append('documentType', documentType);
      formData.append('branchId', convertingLead.branchId);

      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to upload file');
      }

      setUploadedFiles((prev) => ({
        ...prev,
        [documentType]: { url: result.data.url, fileName: result.data.fileName, id: result.data.id },
      }));
      toast.success(`Uploaded ${result.data.fileName} successfully!`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'File upload failed');
    } finally {
      setUploadingStates((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  const handleClearDoc = async (documentType: string) => {
    const targetFile = uploadedFiles[documentType];
    if (!targetFile) return;

    if (!confirm('Are you sure you want to delete this document? The entire document will be deleted.')) {
      return;
    }

    if (targetFile.id) {
      try {
        const res = await fetch(`/api/v1/documents/${targetFile.id}`, {
          method: 'DELETE',
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.messageEnglish || 'Failed to delete document');
        }
        toast.success('Document deleted successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete document');
        return;
      }
    }

    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[documentType];
      return copy;
    });
    router.refresh();
  };

  const [docError, setDocError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);

    const missingMandatory = requirements
      .filter((r) => r.isMandatory && !uploadedFiles[r.documentType])
      .map((r) => r.documentType.replace(/_/g, ' '));

    if (missingMandatory.length > 0) {
      setDocError(`The following required documents are missing: ${missingMandatory.join(', ')}`);
      return;
    }

    try {
      setIsConverting(true);
      const docsPayload = Object.entries(uploadedFiles).map(([docType, f]) => ({
        documentType: docType,
        fileKey: f.url,
        fileName: f.fileName,
        fileType: 'application/pdf', // fallback
        expiryDate: null,
      }));

      const response = await convertLeadAction(convertingLead.id, docsPayload);
      const res = response as any;
      if (res && !res.success) {
        setDocError(res.error || 'Conversion failed. Make sure lead has valid DOB and Email.');
      } else {
        toast.success('Lead converted to student successfully!');
        setConvertingLead(null);
        setUploadedFiles({});
        router.refresh();
      }
    } catch (err: any) {
      setDocError(err.message || 'An unexpected conversion error occurred.');
    } finally {
      setIsConverting(false);
    }
  };
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
      <header className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <Compass className="h-6 w-6 shrink-0 text-[color:var(--ims-brass)] sm:h-8 sm:w-8" />
            Leads
          </h1>
        </div>

        <Button className="h-10 w-10 shrink-0 gap-0 px-0 sm:w-auto sm:px-4" onClick={() => router.push('/leads/create')}>
          <User className="h-4 w-4 sm:mr-2" />
          <span className="sr-only sm:not-sr-only">Create Lead</span>
        </Button>
      </header>

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

            {requirements.map((req) => {
              const file = uploadedFiles[req.documentType];
              const isUploading = uploadingStates[req.documentType];
              return (
                <FormField key={req.documentType}>
                  <FormLabel required={req.isMandatory}>
                    {req.documentType.replace(/_/g, ' ')} {req.isMandatory ? '' : '(Optional)'}
                  </FormLabel>
                  <FormControl>
                    {file ? (
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                        <span className="truncate max-w-[200px] font-mono font-medium">{file.fileName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearDoc(req.documentType)}
                          className="h-5 px-1.5 text-xs text-rose-600 hover:bg-rose-50"
                          disabled={isConverting}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="file"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            handleLeadDocUpload(req.documentType, f);
                          }}
                          disabled={isConverting || isUploading}
                          className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                        {isUploading && <span className="text-[10px] text-slate-500 italic">Uploading to store...</span>}
                      </div>
                    )}
                  </FormControl>
                </FormField>
              );
            })}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConvertingLead(null)} disabled={isConverting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isConverting}>
                {isConverting ? 'Converting...' : 'Complete Admissions Handoff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
