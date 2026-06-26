'use client';

import { CourseGrid, PublicShell, SectionHeading, SimpleCTA, SplitHero, courseCatalog } from '../_components/public-site';

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
        <SectionHeading eyebrow="Course list" title="Every public course page linked below" description="Each card maps to a dedicated detail screen with the live-site copy and a direct contact call to action." />
        <div className="mt-10">
          <CourseGrid courses={courseCatalog} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA title="Need help choosing a course?" description="Use the contact page for batch pricing, group training, and scheduling support." href="/contact-us" label="Open contact page" />
      </section>
    </PublicShell>
  );
}
