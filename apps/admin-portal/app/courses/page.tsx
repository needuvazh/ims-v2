import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SimpleCTA,
} from '../_components/public-site';
import { PublicCourseGrid, PublicStatStrip } from '../_components/public-content';
import { buildPublicMetadata } from '../_components/public-metadata';
import { contactInfo, courseCatalog } from '../_components/public-site-data';

export const metadata = buildPublicMetadata({
  title: 'Courses at Al-Saud Training Institute',
  description:
    'Browse forklift, crane, and elevated work platform courses at Al-Saud Training Institute in Muscat, Oman.',
  path: '/courses',
});

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
        showStats={false}
      />

      {/* ─── STAT STRIP (pulls up over hero on desktop) ───── */}
      <section className="mx-auto max-w-7xl px-4 -mt-12 sm:px-6 lg:px-8 relative z-10">
        <PublicStatStrip />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Course list"
          title="Every public course page linked below"
          description="Each card maps to a dedicated detail screen with the live-site copy and a direct contact call to action."
        />
        <div className="mt-10">
          <PublicCourseGrid courses={courseCatalog} />
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
