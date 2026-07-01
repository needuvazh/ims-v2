'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Pagination,
  DataTableFilter,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  StatCard,
} from '@ims/shared-ui';
import { createCategoryAction } from '../actions';

interface CoursesClientListProps {
  courses: any[];
  categories: any[];
  departments: any[];
  total: number;
  kpis: {
    total: number;
    published: number;
    draft: number;
    inReview: number;
  };
  currentPage: number;
  sessionPermissions: string[];
}

export function CoursesClientList({
  courses,
  categories,
  departments,
  total,
  kpis,
  currentPage,
  sessionPermissions,
}: CoursesClientListProps) {
  const router = useRouter();
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

  const filterConfigs = [
    {
      key: 'categoryId',
      label: 'Category',
      options: categories.map((cat) => ({ value: cat.id, label: cat.nameEnglish })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'InReview', label: 'InReview' },
        { value: 'Approved', label: 'Approved' },
        { value: 'Published', label: 'Published' },
        { value: 'Archived', label: 'Archived' },
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'InReview':
        return <Badge variant="info">InReview</Badge>;
      case 'Approved':
        return <Badge variant="default">Approved</Badge>;
      case 'Published':
        return <Badge variant="success">Published</Badge>;
      case 'Archived':
        return <Badge variant="error">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!categoryCode.trim() || !categoryNameEn.trim() || !categoryNameAr.trim()) {
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[color:var(--ims-ink)] flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            Course Catalog
          </h1>
          <p className="text-sm text-[color:var(--ims-muted)]">
            Manage course templates, bilingual content, and status state configurations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-1.5">
                <FolderPlus className="h-4 w-4" />
                Add Category
              </Button>
              <Button onClick={() => router.push('/courses-catalog/new')} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Create Course
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* Search and Filters */}
      <DataTableFilter searchPlaceholder="Search courses by code, English name or Arabic name..." filters={filterConfigs} />

      {/* Course List Table */}
      <div className="rounded-lg border border-[color:var(--ims-border)] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Course Code</TableHead>
              <TableHead>English Name</TableHead>
              <TableHead>Arabic Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[140px]">Duration</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[color:var(--ims-muted)]">
                  No courses found matching the active filters.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => {
                const deptName = departments.find((d) => d.id === course.departmentId)?.departmentName || 'IT Department';
                return (
                  <TableRow key={course.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-semibold text-indigo-600">{course.courseCode}</TableCell>
                    <TableCell className="font-medium text-slate-800">{course.nameEnglish}</TableCell>
                    <TableCell className="font-medium text-slate-800 text-right font-arabic" dir="rtl">
                      {course.nameArabic}
                    </TableCell>
                    <TableCell className="text-[color:var(--ims-muted)]">{deptName}</TableCell>
                    <TableCell className="text-[color:var(--ims-muted)]">
                      {course.durationValue} {course.durationType}
                    </TableCell>
                    <TableCell>{getStatusBadge(course.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/courses-catalog/${course.id}/edit`)}
                        title="Edit Course"
                      >
                        <ArrowRight className="h-4 w-4 text-slate-500 hover:text-indigo-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && <Pagination page={currentPage} totalPages={totalPages} totalCount={total} limit={10} />}

      {/* Add Category Dialog */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Course Category</DialogTitle>
            <DialogDescription>
              Create a new category for classification. Category names are bilingual.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCategorySubmit} className="space-y-4 py-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category Code (uppercase, e.g. CAT-TECH)</label>
              <Input
                placeholder="CAT-CODE"
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category Name (English)</label>
              <Input
                placeholder="e.g. Technology"
                value={categoryNameEn}
                onChange={(e) => setCategoryNameEn(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category Name (Arabic)</label>
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
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                placeholder="Description of the category..."
                value={categoryDesc}
                onChange={(e) => setCategoryDesc(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-[color:var(--ims-border)] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Parent Category (Optional)</label>
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
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)} disabled={isCreatingCategory}>
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
