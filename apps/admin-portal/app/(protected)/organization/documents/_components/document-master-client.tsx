'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
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
  SimpleTooltip,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  FormControl,
} from '@ims/shared-ui';
import { Plus, Pencil, Trash2, Search, X, ClipboardList } from 'lucide-react';

interface BranchDto {
  id: string;
  branchName: string;
}

interface CourseDto {
  id: string;
  nameEnglish: string;
}

interface RequirementDto {
  id: string;
  targetEntity: 'STUDENT' | 'TRAINER';
  documentType: string;
  isMandatory: boolean;
  branchId: string | null;
  courseId: string | null;
  status: 'Active' | 'Inactive';
  branch?: { branchName: string } | null;
  course?: { nameEnglish: string } | null;
}

interface DocumentMasterClientProps {
  branches: BranchDto[];
  courses: CourseDto[];
  initialSearch: string;
  initialTarget: string;
  initialStatus: string;
  initialSortBy: string;
  initialSortOrder: 'asc' | 'desc';
  initialPage: number;
  initialLimit: number;
}

const TARGET_OPTIONS = [
  { value: 'STUDENT', label: 'STUDENT' },
  { value: 'TRAINER', label: 'TRAINER' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

const SORT_FIELDS = new Set([
  'targetEntity',
  'documentType',
  'isMandatory',
  'branchName',
  'courseName',
  'status',
]);
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function compareNullableText(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return collator.compare(a ?? '', b ?? '');
}

export function DocumentMasterClient({
  branches,
  courses,
  initialSearch,
  initialTarget,
  initialStatus,
  initialSortBy,
  initialSortOrder,
  initialPage,
  initialLimit,
}: DocumentMasterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [requirements, setRequirements] = useState<RequirementDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(initialSearch);

  // Read URL Params State
  const currentSortBy =
    searchParams.get('sortBy') ?? initialSortBy ?? 'targetEntity';
  const currentSortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ??
    initialSortOrder;
  const currentTarget = searchParams.get('target') ?? initialTarget ?? '';
  const currentStatus = searchParams.get('status') ?? initialStatus ?? '';
  const currentPage = Math.max(
    parseInt(searchParams.get('page') ?? String(initialPage), 10) || 1,
    1,
  );
  const currentLimit = Math.max(
    parseInt(searchParams.get('limit') ?? String(initialLimit), 10) ||
      initialLimit ||
      10,
    1,
  );

  // Dialog & Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RequirementDto | null>(null);
  const [formTargetEntity, setFormTargetEntity] = useState<
    'STUDENT' | 'TRAINER'
  >('STUDENT');
  const [formDocumentType, setFormDocumentType] = useState('CIVIL_ID_FRONT');
  const [formIsMandatory, setFormIsMandatory] = useState(true);
  const [formBranchId, setFormBranchId] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequirements = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/documents/requirements');
      if (res.ok) {
        const result = await res.json();
        setRequirements(result.data || []);
      } else {
        toast.error('Failed to load document requirements');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred loading requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

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
    const currentSearch = searchParams.get('q') || '';
    if (searchValue === currentSearch) {
      return;
    }
    const timeout = setTimeout(() => {
      updateParams({ q: searchValue || null, page: '1' });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchParams, searchValue, updateParams]);

  const handleSort = (field: string) => {
    const nextOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormTargetEntity('STUDENT');
    setFormDocumentType('CIVIL_ID_FRONT');
    setFormIsMandatory(true);
    setFormBranchId('');
    setFormCourseId('');
    setFormStatus('Active');
    setIsOpen(true);
  };

  const handleOpenEdit = (rule: RequirementDto) => {
    setEditingRule(rule);
    setFormTargetEntity(rule.targetEntity);
    setFormDocumentType(rule.documentType);
    setFormIsMandatory(rule.isMandatory);
    setFormBranchId(rule.branchId || '');
    setFormCourseId(rule.courseId || '');
    setFormStatus(rule.status);
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      targetEntity: formTargetEntity,
      documentType: formDocumentType,
      isMandatory: formIsMandatory,
      branchId: formBranchId || null,
      courseId: formCourseId || null,
      status: formStatus,
    };

    try {
      const url = editingRule
        ? `/api/v1/documents/requirements/${editingRule.id}`
        : '/api/v1/documents/requirements';
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.messageEnglish || 'Failed to save configuration rule',
        );
      }

      toast.success(
        editingRule
          ? 'Rule updated successfully!'
          : 'New requirement rule created!',
      );
      setIsOpen(false);
      fetchRequirements();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Saving configuration rule failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this requirement rule? This will remove validation checks for new enrollments.',
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/documents/requirements/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.messageEnglish || 'Failed to delete rule');
      }
      toast.success('Requirement rule deleted successfully!');
      fetchRequirements();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed');
    }
  };

  const filteredRequirements = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const target = searchParams.get('target') || '';
    const status = searchParams.get('status') || '';

    return requirements
      .filter((req) => {
        if (target && req.targetEntity !== target) return false;
        if (status && req.status !== status) return false;
        if (!q) return true;

        return [
          req.targetEntity,
          req.documentType,
          req.branch?.branchName,
          req.course?.nameEnglish,
        ].some((val) => val?.toLowerCase().includes(q));
      })
      .sort((left, right) => {
        const direction = currentSortOrder === 'asc' ? 1 : -1;
        if (!SORT_FIELDS.has(currentSortBy)) {
          return (
            compareNullableText(left.targetEntity, right.targetEntity) *
            direction
          );
        }

        switch (currentSortBy) {
          case 'documentType':
            return (
              compareNullableText(left.documentType, right.documentType) *
              direction
            );
          case 'isMandatory':
            return (
              (left.isMandatory === right.isMandatory
                ? 0
                : left.isMandatory
                  ? 1
                  : -1) * direction
            );
          case 'branchName':
            return (
              compareNullableText(
                left.branch?.branchName,
                right.branch?.branchName,
              ) * direction
            );
          case 'courseName':
            return (
              compareNullableText(
                left.course?.nameEnglish,
                right.course?.nameEnglish,
              ) * direction
            );
          case 'status':
            return compareNullableText(left.status, right.status) * direction;
          case 'targetEntity':
          default:
            return (
              compareNullableText(left.targetEntity, right.targetEntity) *
              direction
            );
        }
      });
  }, [currentSortBy, currentSortOrder, requirements, searchParams]);

  const total = filteredRequirements.length;
  const totalPages = Math.max(Math.ceil(total / currentLimit), 1);
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequirements = filteredRequirements.slice(
    (safePage - 1) * currentLimit,
    safePage * currentLimit,
  );

  const columns = [
    {
      header: 'Target Entity',
      sortable: true,
      sortDirection: currentSortBy === 'targetEntity' ? currentSortOrder : null,
      onSort: () => handleSort('targetEntity'),
      render: (req: RequirementDto) => (
        <span className="font-semibold text-slate-800">{req.targetEntity}</span>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Document Type',
      sortable: true,
      sortDirection: currentSortBy === 'documentType' ? currentSortOrder : null,
      onSort: () => handleSort('documentType'),
      render: (req: RequirementDto) => (
        <code className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
          {req.documentType}
        </code>
      ),
    },
    {
      header: 'Enforcement',
      sortable: true,
      sortDirection: currentSortBy === 'isMandatory' ? currentSortOrder : null,
      onSort: () => handleSort('isMandatory'),
      render: (req: RequirementDto) =>
        req.isMandatory ? (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
            Mandatory
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/10">
            Optional
          </span>
        ),
      headerClassName: 'w-[130px]',
    },
    {
      header: 'Branch Scope',
      sortable: true,
      sortDirection: currentSortBy === 'branchName' ? currentSortOrder : null,
      onSort: () => handleSort('branchName'),
      render: (req: RequirementDto) => (
        <span className="text-sm text-slate-600">
          {req.branch?.branchName || 'Global (All)'}
        </span>
      ),
    },
    {
      header: 'Course Scope',
      sortable: true,
      sortDirection: currentSortBy === 'courseName' ? currentSortOrder : null,
      onSort: () => handleSort('courseName'),
      render: (req: RequirementDto) => (
        <span className="text-sm text-slate-600">
          {req.course?.nameEnglish || 'Global (All)'}
        </span>
      ),
    },
    {
      header: 'Status',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (req: RequirementDto) =>
        req.status === 'Active' ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="muted">Inactive</Badge>
        ),
      headerClassName: 'w-[110px]',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (req: RequirementDto) => (
        <div className="flex items-center justify-end gap-1">
          <SimpleTooltip content="Edit Rule" side="top">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEdit(req)}
              className="h-8 w-8 text-[color:var(--ims-muted)] hover:text-[color:var(--ims-ink)]"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Delete Rule" side="top">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteRule(req.id)}
              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        </div>
      ),
      headerClassName: 'text-right w-[110px]',
    },
  ];

  const renderCard = (req: RequirementDto) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {req.targetEntity}
            </p>
            <p className="text-sm font-semibold text-[var(--ims-ink)] font-mono">
              {req.documentType}
            </p>
          </div>
          {req.isMandatory ? (
            <Badge variant="error">Mandatory</Badge>
          ) : (
            <Badge variant="outline">Optional</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">
              Branch Scope
            </p>
            <p className="truncate">
              {req.branch?.branchName || 'Global (All)'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">
              Course Scope
            </p>
            <p className="truncate">
              {req.course?.nameEnglish || 'Global (All)'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-[var(--ims-muted)]">Status</p>
            <p className="truncate">{req.status}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEdit(req)}
            className="flex-1 text-[11px]"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteRule(req.id)}
            className="flex-1 text-[11px] text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  const documentTypeOptions = [
    { value: 'CIVIL_ID_FRONT', label: 'Civil ID Front' },
    { value: 'CIVIL_ID_BACK', label: 'Civil ID Back' },
    { value: 'PASSPORT_SCAN', label: 'Passport Scan' },
    { value: 'ACADEMIC_TRANSCRIPT', label: 'Academic Transcript' },
    { value: 'SPONSORSHIP_LETTER', label: 'Sponsorship Letter' },
    { value: 'OTHER', label: 'Other / Extra Support' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-page-title font-bold tracking-tight text-[var(--ims-ink)]">
            <ClipboardList className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Document Master
          </h1>
          <p className="max-w-2xl text-sm text-[var(--ims-muted)]">
            Manage required identity and academic document requirement
            parameters dynamically.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:w-auto sm:px-4"
        >
          <Plus className="h-4 w-4" />
          Add Requirement
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by entity, type, branch..."
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Target Entity
          </FormLabel>
          <Select
            value={currentTarget}
            onValueChange={(val) => updateParams({ target: val, page: '1' })}
            options={[{ value: '', label: 'All Entities' }, ...TARGET_OPTIONS]}
            className="h-12"
            placeholder="All Entities"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Status
          </FormLabel>
          <Select
            value={currentStatus}
            onValueChange={(val) => updateParams({ status: val, page: '1' })}
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-sm text-[color:var(--ims-muted)]">
          Loading document master rules...
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No requirement rules found"
          description="Create custom checklists or update search/filter criteria."
          action={<Button onClick={handleOpenAdd}>Add Requirement Rule</Button>}
        />
      ) : (
        <>
          <ResponsiveDataTable
            data={paginatedRequirements}
            columns={columns}
            renderCard={renderCard}
            keyExtractor={(req) => req.id}
            emptyState={null}
          />

          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalCount={total}
            limit={currentLimit}
          />
        </>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="!left-auto !right-0 !top-0 !translate-x-0 !translate-y-0 h-full max-h-screen w-full max-w-[32rem] rounded-none border-l border-[color:var(--ims-border)] p-0 bg-white shadow-2xl">
          <form onSubmit={handleFormSubmit} className="flex h-full flex-col">
            <DialogHeader className="border-b border-[color:var(--ims-border)] p-6">
              <DialogTitle>
                {editingRule
                  ? 'Edit Dynamic Requirement Rule'
                  : 'Add New Document Requirement'}
              </DialogTitle>
              <DialogDescription>
                Configure checklists dynamically based on target entity, branch,
                or course scope.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <FormField>
                <FormLabel required>Target Entity Type</FormLabel>
                <FormControl>
                  <Select
                    value={formTargetEntity}
                    onValueChange={(val) => setFormTargetEntity(val as any)}
                    options={[
                      { value: 'STUDENT', label: 'STUDENT' },
                      { value: 'TRAINER', label: 'TRAINER' },
                    ]}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel required>Document Type</FormLabel>
                <FormControl>
                  <Select
                    value={formDocumentType}
                    onValueChange={setFormDocumentType}
                    options={documentTypeOptions}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel>Branch Scope Limit</FormLabel>
                <FormControl>
                  <Select
                    value={formBranchId}
                    onValueChange={setFormBranchId}
                    options={[
                      { value: '', label: 'Global (All Branches)' },
                      ...branches.map((b) => ({
                        value: b.id,
                        label: b.branchName,
                      })),
                    ]}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormField>

              <FormField>
                <FormLabel>Course Scope Limit (Only for STUDENT)</FormLabel>
                <FormControl>
                  <Select
                    value={formCourseId}
                    onValueChange={setFormCourseId}
                    options={[
                      { value: '', label: 'Global (All Courses)' },
                      ...courses.map((c) => ({
                        value: c.id,
                        label: c.nameEnglish,
                      })),
                    ]}
                    disabled={isSubmitting || formTargetEntity === 'TRAINER'}
                  />
                </FormControl>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField>
                  <FormLabel>Requirement Enforcement</FormLabel>
                  <FormControl>
                    <Select
                      value={formIsMandatory ? 'true' : 'false'}
                      onValueChange={(val) =>
                        setFormIsMandatory(val === 'true')
                      }
                      options={[
                        { value: 'true', label: 'Mandatory' },
                        { value: 'false', label: 'Optional' },
                      ]}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormField>

                <FormField>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select
                      value={formStatus}
                      onValueChange={(val) => setFormStatus(val as any)}
                      options={[
                        { value: 'Active', label: 'Active' },
                        { value: 'Inactive', label: 'Inactive' },
                      ]}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormField>
              </div>
            </div>

            <div className="border-t border-[color:var(--ims-border)] p-6 bg-slate-50 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
