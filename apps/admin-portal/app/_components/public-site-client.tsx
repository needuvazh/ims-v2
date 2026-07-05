'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';
import {
  CourseCardSkeleton,
  StatCardSkeleton,
  type CourseCard,
} from './public-site';

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

type PaginatedCourses = {
  courses: PublicCourseListItem[];
  pagination: { total: number; page: number; limit: number; pages: number };
};

export function RealTimeCourseGrid({ limit = 6 }: { limit?: number }) {
  const [data, setData] = useState<PaginatedCourses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchCourses() {
      try {
        const res = await fetch(`/api/public/courses?limit=${limit}`, {
          signal: controller.signal,
          next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error('Failed to fetch courses');
        const json = await res.json();
        setData(json.data);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('Unable to load courses. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
    return () => controller.abort();
  }, [limit]);

  if (loading) {
    return (
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: limit }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !data?.courses.length) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">{error ?? 'No courses available at the moment.'}</p>
        <Link href="/contact-us" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent-600 hover:text-accent-700">
          Contact us for course info <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {data.courses.map((course, index) => (
          <RealTimeCourseCard key={course.id} course={course} index={index} />
        ))}
      </div>
      {data.pagination.total > limit && (
        <div className="mt-10 text-center">
          <Link href="/courses" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-accent-700 transition-colors hover:text-primary-700">
            View all {data.pagination.total} courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}

function RealTimeCourseCard({ course, index }: { course: PublicCourseListItem; index: number }) {
  const durationLabel = course.durationValue
    ? `${course.durationValue} ${course.durationType.toLowerCase()}${course.durationValue > 1 ? 's' : ''}`
    : 'Flexible';

  const priceLabel = course.basePrice
    ? `${course.currency ?? 'OMR'} ${parseFloat(course.basePrice).toFixed(3)}`
    : 'Please enquire';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -8 }}
      className="group flex flex-col overflow-hidden rounded-[2rem] border border-border-light bg-white shadow-sm transition-all hover:border-border-strong hover:shadow-2xl hover:shadow-primary-950/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-100">
        {course.imageUrl ? (
          <Image src={course.imageUrl} alt={course.nameEnglish} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-accent-50 flex items-center justify-center">
            <Clock className="h-12 w-12 text-primary-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Link href={`/courses/${course.slug}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md hover:bg-white/30">
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
        <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-neutral-900 line-clamp-2">{course.nameEnglish}</h3>
        {course.descriptionEnglish && (
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 line-clamp-2">{course.descriptionEnglish}</p>
        )}
        <div className="mt-auto pt-5 space-y-3">
          {course.nextBatchDate && (
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <CalendarIcon className="h-4 w-4 text-primary-600" />
              <span>Next batch: <strong>{new Date(course.nextBatchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong></span>
            </div>
          )}
          {course.availableSeats !== null && course.availableSeats > 0 && (
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Users className="h-4 w-4 text-green-600" />
              <span>{course.availableSeats} seats available</span>
            </div>
          )}
          <ul className="space-y-1.5 text-sm text-neutral-600">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <span className="line-clamp-1">Hands-on practical training</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
              <span className="line-clamp-1">Industry-recognized certification</span>
            </li>
          </ul>
        </div>
      </div>
    </motion.article>
  );
}

function CalendarIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </svg>
  );
}

export function RealTimeStatStrip() {
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>([
    { value: '25k+', label: 'Students trained' },
    { value: '150+', label: 'Success partners' },
    { value: '80+', label: 'Global programs' },
    { value: '20+', label: 'Years experience' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08 }}
          className="rounded-[2rem] border border-border-light bg-white p-6 shadow-card"
        >
          <p className="text-3xl font-black tracking-tight text-neutral-950">{stat.value}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-500">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function RealTimeBatchSchedule() {
  const [batches, setBatches] = useState<Array<{ courseName: string; startDate: string; branchName: string | null; availableSeats: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBatches() {
      try {
        const res = await fetch('/api/public/courses?limit=50');
        if (!res.ok) return;
        const json = await res.json();
        const upcoming = json.data.courses
          .filter((c: PublicCourseListItem) => c.nextBatchDate)
          .slice(0, 4)
          .map((c: PublicCourseListItem) => ({
            courseName: c.nameEnglish,
            startDate: c.nextBatchDate!,
            branchName: null,
            availableSeats: c.availableSeats ?? 0,
          }));
        setBatches(upcoming);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchBatches();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border-light bg-white p-5 shimmer h-20" />
        ))}
      </div>
    );
  }

  if (batches.length === 0) return null;

  return (
    <div className="space-y-3">
      {batches.map((batch, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.08 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border-light bg-white p-4 sm:p-5 hover:border-border-accent transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary-700" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-neutral-900">{batch.courseName}</p>
              <p className="text-xs text-neutral-500">{batch.branchName ?? 'Main Campus'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-neutral-900">{new Date(batch.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="text-xs text-neutral-500">{batch.availableSeats > 0 ? `${batch.availableSeats} seats left` : 'Waitlist'}</p>
            </div>
            <Link href="/contact-us" className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-accent-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-accent-700 transition-colors">
              Book <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
