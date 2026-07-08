'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Building2,
  FolderPlus,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Pagination,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  StatCard,
  FormLabel,
  Select,
  ResponsiveDataTable,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  EmptyState,
} from '@ims/shared-ui';
import { createCategoryAction } from '../actions';

interface CoursesClientListProps {
  courses: Array<{
    id: string;
    courseCode: string;
    nameEnglish: string;
    nameArabic: string;
    departmentId: string;
    categoryId?: string | null;
    durationType: string;
    durationValue: number;
    status: string;
  }>;
  categories: Array<{
    id: string;
    code: string;
    nameEnglish: string;
    nameArabic: string;
  }>;
  departments: Array<{ id: string; departmentName: string }>;
  total: number;
  kpis: {
    total: number;
    published: number;
    draft: number;
    inReview: number;
  };
  currentPage: number;
  sessionPermissions: string[];
  defaultSearch: string;
  defaultCategoryId: string;
  defaultStatus: string;
  defaultSortBy: string;
  defaultSortOrder: 'asc' | 'desc';
}

type SortOrder = 'asc' | 'desc';

export function CoursesClientList({
  courses,
  categories,
  departments,
  total,
  kpis,
  currentPage,
  sessionPermissions,
  defaultSearch,
  defaultCategoryId,
  defaultStatus,
  defaultSortBy,
  defaultSortOrder,
}: CoursesClientListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / 10);

  // Category creation state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryCode, setCategoryCode] = useState('');
  const [categoryNameEn, setCategoryNameEn] = useState('');
  const [categoryNameAr, setCategoryNameAr] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(defaultSearch);

  const currentSortBy =
    searchParams.get('sortBy') ?? defaultSortBy ?? 'createdAt';
  const currentSortOrder =
    (searchParams.get('sortOrder') as SortOrder | null) ?? defaultSortOrder;

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
    const nextOrder: SortOrder =
      currentSortBy === field && currentSortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: field, sortOrder: nextOrder, page: '1' });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Published':
        return 'success';
      case 'Approved':
        return 'info';
      case 'InReview':
        return 'warning';
      case 'Draft':
        return 'outline';
      case 'Archived':
        return 'muted';
      default:
        return 'default';
    }
  };

  const getDepartmentName = (departmentId: string) =>
    departments.find((d) => d.id === departmentId)?.departmentName ||
    'Unassigned';

  const getCategoryLabel = (categoryId?: string | null) => {
    if (!categoryId) {
      return 'Uncategorized';
    }

    return (
      categories.find((category) => category.id === categoryId)?.nameEnglish ||
      'Uncategorized'
    );
  };

  const activeFilters = [
    { label: 'Search', value: defaultSearch },
    {
      label: 'Category',
      value:
        categories.find((category) => category.id === defaultCategoryId)
          ?.nameEnglish || defaultCategoryId,
    },
    { label: 'Status', value: defaultStatus },
  ].filter((item) => item.value);

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (
      !categoryCode.trim() ||
      !categoryNameEn.trim() ||
      !categoryNameAr.trim()
    ) {
      setErrorMsg('Code, English Name, and Arabic Name are required.');
      return;
    }

    try {
      setIsCreatingCategory(true);
      const res = await createCategoryAction({
        code: categoryCode.trim().toUpperCase(),
        nameEnglish: categoryNameEn.trim(),
        nameArabic: categoryNameAr.trim(),
        description: categoryDesc.trim() || undefined,
        parentCategoryId: parentCategoryId || null,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create category.');
      } else {
        toast.success('Course category created successfully!');
        setIsCategoryModalOpen(false);
        setCategoryCode('');
        setCategoryNameEn('');
        setCategoryNameAr('');
        setCategoryDesc('');
        setParentCategoryId('');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const canCreate = sessionPermissions.includes('course.catalog.create');

  const columns = [
    {
      header: 'Course Code',
      sortable: true,
      sortDirection: currentSortBy === 'courseCode' ? currentSortOrder : null,
      onSort: () => handleSort('courseCode'),
      render: (course: CoursesClientListProps['courses'][number]) => (
        <span className="font-mono font-medium text-slate-800">
          {course.courseCode}
        </span>
      ),
      headerClassName: 'w-[120px]',
    },
    {
      header: 'English Name',
      sortable: true,
      sortDirection: currentSortBy === 'nameEnglish' ? currentSortOrder : null,
      onSort: () => handleSort('nameEnglish'),
      render: (course: CoursesClientListProps['courses'][number]) => (
        <div className="font-medium text-slate-800">{course.nameEnglish}</div>
      ),
    },
    {
      header: 'Arabic Name',
      sortable: true,
      sortDirection: currentSortBy === 'nameArabic' ? currentSortOrder : null,
      onSort: () => handleSort('nameArabic'),
      render: (course: CoursesClientListProps['courses'][number]) => (
        <div
          className="font-medium text-slate-800 text-right font-arabic"
          dir="rtl"
        >
          {course.nameArabic}
        </div>
      ),
      headerClassName: 'text-right',
    },
    {
      header: 'Department',
      render: (course: CoursesClientListProps['courses'][number]) => (
        <span className="text-[color:var(--ims-muted)]">
          {getDepartmentName(course.departmentId)}
        </span>
      ),
    },
    {
      header: 'Duration',
      sortable: true,
      sortDirection:
        currentSortBy === 'durationValue' ? currentSortOrder : null,
      onSort: () => handleSort('durationValue'),
      render: (course: CoursesClientListProps['courses'][number]) => (
        <span className="text-[color:var(--ims-muted)]">
          {course.durationValue} {course.durationType}
        </span>
      ),
      headerClassName: 'w-[140px]',
    },
    {
      header: 'Status',
      className: 'text-center',
      sortable: true,
      sortDirection: currentSortBy === 'status' ? currentSortOrder : null,
      onSort: () => handleSort('status'),
      render: (course: CoursesClientListProps['courses'][number]) => (
        <Badge variant={getStatusBadgeVariant(course.status)}>
          {course.status}
        </Badge>
      ),
      headerClassName: 'w-[120px] text-center',
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (course: CoursesClientListProps['courses'][number]) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/courses-catalog/${course.id}/edit`)}
          title="Edit Course"
        >
          <ArrowRight className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
        </Button>
      ),
      headerClassName: 'w-[100px] text-right',
    },
  ];

  const renderCard = (course: CoursesClientListProps['courses'][number]) => (
    <Card className="transition-colors hover:border-[var(--ims-brass)]">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-card-p">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--ims-muted)]">
              {course.courseCode}
            </p>
            <p className="text-sm font-bold text-[var(--ims-ink)]">
              {course.nameEnglish}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(course.status)}>
            {course.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-card-p">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Arabic Name</p>
            <p className="truncate text-right font-arabic" dir="rtl">
              {course.nameArabic}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Department</p>
            <p className="truncate">{getDepartmentName(course.departmentId)}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Category</p>
            <p className="truncate">{getCategoryLabel(course.categoryId)}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="font-semibold text-[var(--ims-muted)]">Duration</p>
            <p className="truncate">
              {course.durationValue} {course.durationType}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-card-p pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px]"
          onClick={() => router.push(`/courses-catalog/${course.id}/edit`)}
        >
          <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Edit Course
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2 font-bold tracking-tight text-[var(--ims-ink)]">
            <BookOpen className="h-6 w-6 shrink-0 text-indigo-600 sm:h-8 sm:w-8" />
            Course Catalog
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreate && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsCategoryModalOpen(true)}
                className="h-10 gap-0 px-3 sm:gap-1.5 sm:px-4"
              >
                <FolderPlus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Add Category</span>
              </Button>
              <Button
                onClick={() => router.push('/courses-catalog/new')}
                className="h-10 gap-0 px-3 sm:gap-1.5 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Create Course</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
        <StatCard
          title="Total Courses"
          value={kpis.total}
          description="Syllabus templates globally"
          icon={<BookOpen className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          title="Published Courses"
          value={kpis.published}
          description="Available for new enrollments"
          icon={<Sparkles className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          title="In Review / Approved"
          value={kpis.inReview}
          description="Pending configurations verification"
          icon={<Layers className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          title="Draft Courses"
          value={kpis.draft}
          description="Work in progress templates"
          icon={<Building2 className="h-5 w-5" />}
          tone="sky"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_repeat(2,minmax(0,1fr))]">
        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Search
          </FormLabel>
          <div className="relative">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search courses by code, English name or Arabic name..."
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

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Category
          </FormLabel>
          <Select
            value={searchParams.get('categoryId') || ''}
            onChange={(e) =>
              updateParams({ categoryId: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((cat) => ({
                value: cat.id,
                label: cat.nameEnglish,
              })),
            ]}
            className="h-12"
            placeholder="All Categories"
          />
        </div>

        <div className="min-w-0">
          <FormLabel className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ims-muted)]">
            Status
          </FormLabel>
          <Select
            value={searchParams.get('status') || ''}
            onChange={(e) =>
              updateParams({ status: e.target.value, page: '1' })
            }
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'InReview', label: 'In Review' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Published', label: 'Published' },
              { value: 'Archived', label: 'Archived' },
            ]}
            className="h-12"
            placeholder="All Statuses"
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ims-muted)]">
          <span className="font-semibold uppercase tracking-[0.18em]">
            Active filters
          </span>
          {activeFilters.map((filter) => (
            <span
              key={`${filter.label}-${filter.value}`}
              className="rounded-full border border-[color:var(--ims-border)] bg-white px-3 py-1"
            >
              {filter.label}: {filter.value}
            </span>
          ))}
        </div>
      )}

      <ResponsiveDataTable
        data={courses}
        columns={columns}
        renderCard={renderCard}
        keyExtractor={(course) => course.id}
        emptyState={
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="No courses found"
            description="No course templates match your current filter criteria."
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={total}
          limit={10}
        />
      )}

      {/* Add Category Dialog */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Course Category</DialogTitle>
            <DialogDescription>
              Create a new category for classification. Category names are
              bilingual.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleCreateCategorySubmit}
            className="space-y-4 py-4"
          >
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Category Code (uppercase, e.g. CAT-TECH)
              </label>
              <Input
                placeholder="CAT-CODE"
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Category Name (English)
              </label>
              <Input
                placeholder="e.g. Technology"
                value={categoryNameEn}
                onChange={(e) => setCategoryNameEn(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Category Name (Arabic)
              </label>
              <Input
                placeholder="e.g. التكنولوجيا"
                value={categoryNameAr}
                onChange={(e) => setCategoryNameAr(e.target.value)}
                className="text-right font-arabic"
                dir="rtl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Description
              </label>
              <textarea
                placeholder="Description of the category..."
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-[color:var(--ims-border)] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Parent Category (Optional)
              </label>
              <select
                value={parentCategoryId}
                onChange={(e) => setParentCategoryId(e.target.value)}
                className="w-full rounded-md border border-[color:var(--ims-border)] p-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">None (Top Level Category)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameEnglish} / {cat.nameArabic}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
                disabled={isCreatingCategory}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingCategory}>
                {isCreatingCategory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Category'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
