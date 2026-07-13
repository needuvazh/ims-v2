import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Award, BookOpen, ShieldCheck, Users, Clock, CheckCircle2 } from 'lucide-react';
import type { CourseCard } from './public-site-data';

const publicStats = [
  { value: '25k+', label: 'Students Trained', icon: Users },
  { value: '150+', label: 'Success Partners', icon: ShieldCheck },
  { value: '80+', label: 'Global Programs', icon: BookOpen },
  { value: '20+', label: 'Years Experience', icon: Award },
];

export function PublicStatStrip() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {publicStats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-[2rem] border border-border-light bg-white p-6 shadow-sm"
            >
              <div className="inline-flex rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 p-4 text-accent-600 ring-1 ring-accent-600/10">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-5 font-display text-4xl font-bold text-neutral-900">
                {item.value}
              </p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PublicCourseGrid({ courses }: { courses: CourseCard[] }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <article
          key={course.slug}
          className="group flex flex-col overflow-hidden rounded-[2rem] border border-border-light bg-white shadow-sm transition-all hover:border-border-strong hover:shadow-2xl hover:shadow-primary-950/5"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={course.image}
              alt={course.imageAlt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Link
                href={`/${course.slug}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md hover:bg-white/30"
              >
                View Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex flex-1 flex-col p-card-p">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
                {course.duration}
              </p>
              <span className="rounded-full bg-muted-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600">
                {course.price}
              </span>
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-neutral-900">
              {course.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 line-clamp-2">
              {course.summary}
            </p>
            <div className="mt-auto pt-6">
              <ul className="space-y-2 text-sm text-neutral-600">
                {course.points.slice(0, 2).map((point) => (
                  <li key={point} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                    <span className="line-clamp-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PublicCourseSectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-neutral-500">
      <Clock className="h-4 w-4" />
      <span>{title}</span>
      <span className="hidden sm:inline text-neutral-300">|</span>
      <span className="hidden sm:inline font-medium normal-case tracking-normal text-neutral-600">
        {description}
      </span>
    </div>
  );
}
