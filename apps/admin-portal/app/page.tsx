import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SectionCardGridByName,
  ContactBlock,
  SimpleCTA,
  contactInfo,
  FAQAccordion,
  TestimonialGrid,
  WhatsAppButton,
  AccreditationStrip,
  DarkFacilitiesSection,
  CourseCardSkeleton,
} from './_components/public-site';
import {
  RealTimeStatStrip,
} from './_components/public-site-client';
import { CoursesClient } from './_components/courses-page-client';

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
        <RealTimeStatStrip />
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
              description="Filter our heavy equipment, crane, forklift, and safety courses by category or search below."
            />
          </div>
          <div className="mt-10">
            <Suspense fallback={<CoursesSkeleton />}>
              <CoursesClient />
            </Suspense>
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

function CoursesSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
