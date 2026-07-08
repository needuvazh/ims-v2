import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  PublicShell,
  SplitHero,
  SectionHeading,
  SectionCardGrid,
  SectionCardGridByName,
  ContactBlock,
  SimpleCTA,
  facilityCards,
  contactInfo,
  FAQAccordion,
  TestimonialGrid,
  WhatsAppButton,
} from './_components/public-site';
import {
  RealTimeCourseGrid,
  RealTimeStatStrip,
  RealTimeBatchSchedule,
} from './_components/public-site-client';

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
      <SplitHero
        eyebrow="Al-Saud Training Institute"
        title={
          <>
            Redefining
            <br />
            Professional Growth.
          </>
        }
        description="Building a future-ready workforce for Oman through hands-on training in heavy machinery, crane operation, and practical certification pathways."
        image="/alsaud/hero.jpg"
        imageAlt="Al-Saud Training Institute"
        primaryHref="/courses"
        primaryLabel="Browse Courses"
        secondaryHref="/about"
        secondaryLabel="About Us"
      />

      <section className="mx-auto max-w-7xl px-4 -mt-6 sm:px-6 lg:px-8 relative z-10">
        <RealTimeStatStrip />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why choose us"
          title="Focused training built for real workplaces"
          description="The institute combines practical instruction, safety standards, and career-ready outcomes for operators and organizations."
        />
        <div className="mt-10">
          <SectionCardGridByName items={homeFeatures} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Our courses"
            title="Latest training programs"
            description="Core programs cover forklift operation, crane work, elevated platforms, and customized professional courses."
          />
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-accent-700 transition-colors hover:text-primary-700"
          >
            View full directory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10">
          <RealTimeCourseGrid limit={6} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Upcoming batches"
          title="Next available training dates"
          description="Secure your spot in the next available batch. Limited seats per session for focused, hands-on learning."
        />
        <div className="mt-10">
          <RealTimeBatchSchedule />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Training facilities"
          title="Practical spaces that support real learning"
          description="Dedicated rooms and practical areas help learners build confidence before assessment and deployment."
        />
        <div className="mt-10">
          <SectionCardGrid items={facilityCards} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Testimonials"
          title="What our graduates say"
          description="Hear from professionals who advanced their careers through our training programs."
          align="center"
        />
        <div className="mt-10">
          <TestimonialGrid testimonials={testimonials} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Need a course recommendation or a group booking?"
          description={`Reach the admissions team at ${contactInfo.phone} or ${contactInfo.email} for dates, pricing, and delivery options.`}
          href="/contact-us"
          label="Contact us"
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ContactBlock />
      </section>

      <WhatsAppButton />
    </PublicShell>
  );
}
