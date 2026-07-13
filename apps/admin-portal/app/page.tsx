import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SectionCardGridByName,
  ContactBlock,
  SimpleCTA,
  FAQAccordion,
  FAQStructuredData,
  TestimonialGrid,
  WhatsAppButton,
  AccreditationStrip,
  DarkFacilitiesSection,
} from './_components/public-site';
import { PublicCourseGrid, PublicStatStrip } from './_components/public-content';
import { buildPublicMetadata } from './_components/public-metadata';
import { contactInfo, courseCatalog } from './_components/public-site-data';

export const metadata = buildPublicMetadata({
  title: 'Al-Saud Training Institute',
  description:
    'Al-Saud Training Institute in Muscat provides forklift, crane, and safety training for individuals and corporate teams.',
  path: '/',
});

const homeFeatures = [
  {
    title: 'Hands-on training',
    description:
      'Practical operator-focused delivery for forklifts, cranes, and elevated work platforms.',
    iconName: 'GraduationCap',
  },
  {
    title: 'Safety-led instruction',
    description:
      'Every course is shaped around safe operation, legal awareness, and confident workplace practice.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'Corporate delivery',
    description:
      'Flexible group training and custom scheduling for companies and project teams.',
    iconName: 'Users',
  },
];

const faqItems = [
  {
    question: 'How do I enroll in a course?',
    answer:
      'Contact our admissions team at +968 9658 9150 or visit our contact page. We will guide you through the enrollment process, available dates, and pricing options.',
  },
  {
    question: 'Do you offer corporate training packages?',
    answer:
      'Yes, we provide customized training solutions for organizations. Contact us to discuss your team size, preferred courses, and scheduling requirements.',
  },
  {
    question: 'What certification do I receive?',
    answer:
      'Upon successful completion, you receive an industry-recognized certificate that validates your practical skills and safety knowledge.',
  },
  {
    question: 'Are there any prerequisites for the courses?',
    answer:
      'Most courses are open to beginners. Some advanced programs may require prior experience. Contact us for specific course requirements.',
  },
  {
    question: 'Can I reschedule my training?',
    answer:
      'Yes, rescheduling is possible subject to availability. Please contact our admissions team at least 48 hours before your scheduled start date.',
  },
];

const testimonials = [
  {
    quote:
      'The hands-on training was exceptional. I felt confident operating heavy machinery from day one at work.',
    author: 'Ahmed Al-Balushi',
    role: 'Forklift Operator, PDO',
  },
  {
    quote:
      'Professional instructors, well-equipped facilities, and a strong focus on safety. Highly recommended.',
    author: 'Rahul Sharma',
    role: 'Site Supervisor, Galfar',
  },
  {
    quote:
      'Our entire team completed the crane operation course. The corporate scheduling was seamless.',
    author: 'Fatima Al-Hinai',
    role: 'HR Manager, Omran',
  },
];

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <PublicShell>
      {/* ─── HERO ─────────────────────────────────────────── */}
      <SplitHero
        eyebrow="Al-Saud Training Institute"
        title={
          <>
            Oman&apos;s Leading
            <br />
            <span className="text-gradient-orange">Heavy Machinery</span>
            <br />
            Training Center.
          </>
        }
        description="Building a future-ready workforce through NPORS-accredited, hands-on training in forklift operation, crane work, elevated work platforms, and more — right here in Muscat."
        image="/alsaud/hero.jpg"
        imageAlt="Al-Saud Training Institute — Heavy Machinery Training"
        primaryHref="/courses"
        primaryLabel="Browse Courses"
        secondaryHref="/about"
        secondaryLabel="About Us"
        showStats={false}
      />

      {/* ─── STAT STRIP (pulls up over hero on desktop) ───── */}
      <section className="mx-auto max-w-7xl px-4 -mt-12 sm:px-6 lg:px-8 relative z-10">
        <PublicStatStrip />
      </section>

      {/* ─── WHY CHOOSE US ─── White background ────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why choose us"
          title="Focused training built for real workplaces"
          description="The institute combines practical instruction, safety standards, and career-ready outcomes for operators and organizations."
        />
        <div className="mt-10">
          <SectionCardGridByName items={homeFeatures} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Training paths"
          title="Popular courses people start with"
          description="Use these course pages to compare the core training paths, then contact admissions for the right recommendation."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {courseCatalog.slice(0, 4).map((course) => (
            <Link
              key={course.slug}
              href={`/${course.slug}`}
              className="group rounded-[2rem] border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-100 hover:shadow-xl hover:shadow-orange-600/5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                {course.duration}
              </p>
              <h3 className="mt-3 font-display text-lg font-bold text-neutral-900">
                {course.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {course.summary}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700 transition-colors group-hover:text-orange-600">
                View course <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── ACCREDITATION STRIP ─── Light neutral bg ──────── */}
      <section className="bg-neutral-50 border-y border-neutral-100 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AccreditationStrip />
        </div>
      </section>

      {/* ─── COURSES GRID ─── Warm tinted background ────────── */}
      <section className="bg-gradient-to-b from-amber-50/60 to-orange-50/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Our courses"
              title="Latest training programs"
              description="Browse the most requested training programs first, then open the full course directory for more options."
            />
          </div>
          <div className="mt-10">
            <PublicCourseGrid courses={courseCatalog.slice(0, 6)} />
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-accent-700 transition-colors hover:text-primary-700"
            >
              View all courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      {/* ─── FACILITIES ─── Dark navy background ─────────────── */}
      <DarkFacilitiesSection />

      {/* ─── TESTIMONIALS ─── Light gradient bg ──────────────── */}
      <section className="bg-gradient-to-b from-neutral-50 to-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Testimonials"
            title="What our graduates say"
            description="Hear from professionals who advanced their careers through our training programs."
            align="center"
          />
          <div className="mt-12">
            <TestimonialGrid testimonials={testimonials} />
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── White background ─────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <FAQStructuredData items={faqItems} />
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Quick answers to common questions about our courses, enrollment, and certification."
          align="center"
        />
        <div className="mt-10">
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      {/* ─── CTA ─── Dark background ──────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Need a course recommendation or a group booking?"
          description={`Reach the admissions team at ${contactInfo.phone} or ${contactInfo.email} for dates, pricing, and delivery options.`}
          href="/contact-us"
          label="Contact us"
        />
      </section>

      {/* ─── CONTACT BLOCK ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ContactBlock />
      </section>

      <WhatsAppButton />
    </PublicShell>
  );
}
