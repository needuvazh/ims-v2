import { Suspense } from 'react';
import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SimpleCTA,
  contactInfo,
  CourseCardSkeleton,
} from '../_components/public-site';
import { CoursesClient } from '../_components/courses-page-client';

export const dynamic = 'force-dynamic';

export default function CoursesPage() {
  return (
    <PublicShell>
      <SplitHero
        eyebrow="Courses"
        title={
          <>
            Explore the
            <br />
            course directory.
          </>
        }
        description="Find the institute's forklift, crane, and elevated work platform courses, plus custom professional training options."
        image="/alsaud/hero.jpg"
        imageAlt="Course directory"
        primaryHref="/contact-us"
        primaryLabel="Ask about pricing"
        secondaryHref="/about"
        secondaryLabel="About the institute"
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Course list"
          title="Every public course page linked below"
          description="Each card maps to a dedicated detail screen with the live-site copy and a direct contact call to action."
        />
        <div className="mt-10">
          <Suspense fallback={<CoursesSkeleton />}>
            <CoursesClient />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Need help choosing a course?"
          description="Use the contact page for batch pricing, group training, and scheduling support."
          href="/contact-us"
          label="Open contact page"
        />
      </section>
    </PublicShell>
  );
}

function CoursesSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
