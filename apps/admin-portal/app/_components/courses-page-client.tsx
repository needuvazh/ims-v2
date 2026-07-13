'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  SlidersHorizontal,
  Users,
  X,
  FolderOpen,
} from 'lucide-react';
import { CourseCardSkeleton } from './public-site';

type PublicCourseListItem = {
  id: string;
  slug: string;
  nameEnglish: string;
  nameArabic: string;
  descriptionEnglish: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  durationType: string;
  durationValue: number;
  basePrice: string | null;
  currency: string | null;
  nextBatchDate: string | null;
  availableSeats: number | null;
  imageUrl: string | null;
};

type PublicCategory = {
  id: string;
  code: string;
  nameEnglish: string;
  nameArabic: string;
  description: string | null;
  courseCount: number;
};

type PaginatedCourses = {
  courses: PublicCourseListItem[];
  pagination: { total: number; page: number; limit: number; pages: number };
};

const PAGE_SIZE = 9;

export function CoursesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [courses, setCourses] = useState<PaginatedCourses | null>(null);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [showFilters, setShowFilters] = useState(false);

  const categoryId = searchParams.get('categoryId') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(page));
      if (categoryId) params.set('categoryId', categoryId);
      if (search) params.set('search', search);

      const [coursesRes, categoriesRes] = await Promise.all([
        fetch(`/api/public/courses?${params.toString()}`),
        fetch('/api/public/categories'),
      ]);

      if (coursesRes.ok) {
        const coursesJson = await coursesRes.json();
        setCourses(coursesJson.data);
      }
      if (categoriesRes.ok) {
        const catJson = await categoriesRes.json();
        setCategories(catJson.data.categories);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: search || null });
  };

  const handleCategoryChange = (catId: string | null) => {
    updateParams({ categoryId: catId });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-8 space-y-6">
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  updateParams({ search: null });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-50"
              >
                <X className="h-4 w-4 text-neutral-400" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-bold uppercase tracking-[0.1em] hover:shadow-lg hover:shadow-orange-600/20 hover:-translate-y-0.5 transition-all"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-neutral-100 bg-white text-sm font-bold text-neutral-700 hover:border-orange-100 hover:text-orange-600 transition-all sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </form>

        {/* Category Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                !categoryId
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-white border border-neutral-100 text-neutral-600 hover:border-orange-100 hover:text-orange-600'
              }`}
            >
              All ({categories.reduce((sum, c) => sum + c.courseCount, 0)})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  handleCategoryChange(cat.id === categoryId ? null : cat.id)
                }
                className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                  categoryId === cat.id
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'bg-white border border-neutral-100 text-neutral-600 hover:border-orange-100 hover:text-orange-600'
                }`}
              >
                {cat.nameEnglish} ({cat.courseCount})
              </button>
            ))}
          </div>
        </div>

        {activeCategory && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Filtered by:</span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 font-bold border border-orange-100">
              {activeCategory.nameEnglish}
              <button
                onClick={() => handleCategoryChange(null)}
                className="ml-1 hover:text-orange-950 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !courses?.courses.length && (
        <div className="flex flex-col items-center justify-center text-center py-20 px-4 rounded-[2rem] border border-neutral-100 bg-white shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 mb-6 border border-orange-100/50">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h3 className="font-display text-xl font-bold text-neutral-900">No courses found</h3>
          <p className="mt-2 text-sm text-neutral-500 max-w-md">
            We couldn&apos;t find any courses matching your current search or filter. Try checking your spelling or selecting another category.
          </p>
          <button
            onClick={() => {
              setSearch('');
              handleCategoryChange(null);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-orange-600 shadow-sm transition-all hover:bg-orange-600 hover:text-white hover:border-orange-600"
          >
            Clear all filters <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Course Grid */}
      {!loading && courses?.courses.length ? (
        <>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {courses.courses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>

          {/* Pagination */}
          {courses.pagination.pages > 1 && (
            <div className="mt-16 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg text-sm font-bold text-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Previous
              </button>
              {Array.from(
                { length: courses.pagination.pages },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                    p === page
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                      : 'text-neutral-500 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= courses.pagination.pages}
                className="px-4 py-2 rounded-lg text-sm font-bold text-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function CourseCard({
  course,
  index,
}: {
  course: PublicCourseListItem;
  index: number;
}) {
  const durationLabel = course.durationValue
    ? `${course.durationValue} ${course.durationType.toLowerCase()}${course.durationValue > 1 ? 's' : ''}`
    : 'Flexible';

  const priceLabel = course.basePrice
    ? `${course.currency ?? 'OMR'} ${parseFloat(course.basePrice).toFixed(3)}`
    : 'Please enquire';

  const normalizedImageUrl = (() => {
    if (!course.imageUrl) return null;
    const url = course.imageUrl.trim();
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        new URL(url);
        return url;
      } catch {
        return null;
      }
    }
    if (url.startsWith('/')) {
      return url;
    }
    return `/${url}`;
  })();

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -8 }}
      className="group flex flex-col overflow-hidden rounded-[2rem] border border-border-light bg-white shadow-sm transition-all hover:border-border-strong hover:shadow-2xl hover:shadow-primary-950/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-100">
        {normalizedImageUrl ? (
          <Image
            src={normalizedImageUrl}
            alt={course.nameEnglish}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-accent-50 flex items-center justify-center">
            <Clock className="h-12 w-12 text-primary-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Link
            href={`/courses/${course.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md hover:bg-white/30"
          >
            View Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {course.categoryName && (
          <div className="absolute top-4 left-4">
            <span className="rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-700">
              {course.categoryName}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
            <Clock className="h-3.5 w-3.5" />
            {durationLabel}
          </div>
          <span className="rounded-full bg-muted-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600">
            {priceLabel}
          </span>
        </div>
        <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-neutral-900 line-clamp-2">
          {course.nameEnglish}
        </h3>
        {course.descriptionEnglish && (
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 line-clamp-2">
            {course.descriptionEnglish}
          </p>
        )}
        <div className="mt-auto pt-5">
          <ul className="space-y-1.5 text-sm text-neutral-600">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <span className="line-clamp-1">Hands-on practical training</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <span className="line-clamp-1">
                Industry-recognized certification
              </span>
            </li>
          </ul>
        </div>
      </div>
    </motion.article>
  );
}

function CalendarIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
