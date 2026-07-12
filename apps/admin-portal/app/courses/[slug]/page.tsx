import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  PublicShell,
  HeroSection,
  SectionHeading,
  SimpleCTA,
  BulletList,
  contactInfo,
  WhatsAppButton,
} from '../../_components/public-site';

type PublicCourseDetail = {
  id: string;
  slug: string;
  nameEnglish: string;
  nameArabic: string;
  descriptionEnglish: string | null;
  descriptionArabic: string | null;
  courseCode: string;
  categoryCode: string | null;
  categoryName: string | null;
  durationType: string;
  durationValue: number;
  basePrice: string | null;
  taxPercentage: string | null;
  currency: string | null;
  batches: Array<{
    id: string;
    batchCode: string;
    batchName: string;
    startDate: string;
    endDate: string;
    capacity: number;
    currentEnrollment: number;
    availableSeats: number;
    status: string;
    branchName: string | null;
    trainerName: string | null;
  }>;
};

async function fetchCourse(slug: string): Promise<PublicCourseDetail | null> {
  try {
    const { publicCourseQueryService } = await import('@/lib/runtime');
    const course = await publicCourseQueryService.getCourseBySlug(slug);
    return course as any;
  } catch (error) {
    console.error('Error fetching course detail:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await fetchCourse(slug);
  if (!course) {
    return {
      title: 'Course Not Found | Al-Saud Training Institute',
    };
  }

  return {
    title: `${course.nameEnglish} | Al-Saud Training Institute`,
    description:
      course.descriptionEnglish ??
      `Learn ${course.nameEnglish} at Al-Saud Training Institute. Hands-on training with industry-recognized certification.`,
    openGraph: {
      title: `${course.nameEnglish} | Al-Saud Training Institute`,
      description: course.descriptionEnglish ?? '',
      type: 'article',
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await fetchCourse(slug);

  if (!course) {
    notFound();
  }

  const c = course;

  const durationLabel = c.durationValue
    ? `${c.durationValue} ${c.durationType.toLowerCase()}${c.durationValue > 1 ? 's' : ''}`
    : 'Flexible';

  const priceLabel = c.basePrice
    ? `${c.currency ?? 'OMR'} ${parseFloat(c.basePrice).toFixed(3)}`
    : 'Please enquire';

  const totalPrice =
    c.basePrice && c.taxPercentage
      ? (
          parseFloat(c.basePrice) *
          (1 + parseFloat(c.taxPercentage) / 100)
        ).toFixed(3)
      : null;

  return (
    <PublicShell>
      <HeroSection
        eyebrow={c.categoryName ?? 'Course detail'}
        title={c.nameEnglish}
        description={c.descriptionEnglish ?? ''}
        image="/alsaud/hero.jpg"
        imageAlt={c.nameEnglish}
        primaryHref="/contact-us"
        primaryLabel="Book Now"
        secondaryHref="/courses"
        secondaryLabel="Back to Courses"
        stats={[
          { value: durationLabel, label: 'Duration', icon: 'clock' },
          { value: 'Safety-first', label: 'Training method', icon: 'shield' },
          { value: 'Certified', label: 'Outcome', icon: 'award' },
          { value: priceLabel, label: 'Price', icon: 'mapPin' },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:pt-32">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Main Content */}
          <div className="space-y-10">
            <div className="rounded-[2.5rem] border border-border-light bg-white p-8 shadow-xl shadow-primary-950/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
                What this course covers
              </p>
              <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-neutral-900">
                Course Overview
              </h3>
              {c.descriptionEnglish ? (
                <p className="mt-4 leading-relaxed text-neutral-600">
                  {c.descriptionEnglish}
                </p>
              ) : (
                <p className="mt-4 leading-relaxed text-neutral-600">
                  This course provides comprehensive hands-on training designed
                  to prepare you for real-world operation. Contact our
                  admissions team for detailed course content and learning
                  outcomes.
                </p>
              )}
              <div className="mt-6">
                <BulletList
                  items={[
                    'Hands-on practical training with real equipment',
                    'Safety standards and legal compliance awareness',
                    'Pre-operation checks and equipment maintenance',
                    'Industry-recognized certification upon completion',
                  ]}
                />
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-[2.5rem] border border-border-light bg-white p-8 shadow-xl shadow-primary-950/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-600">
                Course summary
              </p>
              <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-neutral-900">
                {c.nameEnglish}
              </h3>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border-light">
                  <span className="text-sm text-neutral-500">Duration</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {durationLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-light">
                  <span className="text-sm text-neutral-500">Base Price</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {priceLabel}
                  </span>
                </div>
                {totalPrice && totalPrice !== priceLabel && (
                  <div className="flex items-center justify-between py-3 border-b border-border-light">
                    <span className="text-sm text-neutral-500">
                      Total (incl. tax)
                    </span>
                    <span className="text-sm font-bold text-neutral-900">
                      {c.currency ?? 'OMR'} {totalPrice}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-border-light">
                  <span className="text-sm text-neutral-500">Category</span>
                  <span className="text-sm font-bold text-neutral-900">
                    {c.categoryName ?? 'General'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-neutral-500">Course Code</span>
                  <span className="text-sm font-bold text-neutral-900 font-mono">
                    {c.courseCode}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/contact-us"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-accent-600/20 hover:-translate-y-0.5 transition-transform"
                >
                  Book This Course <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`https://wa.me/96896589150?text=${encodeURIComponent(`Hi, I'm interested in the ${c.nameEnglish} c. Can you share more details?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-green-500 bg-green-50 px-6 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-green-700 hover:bg-green-100 transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enquire on WhatsApp
                </a>
              </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 p-5 ring-1 ring-border-light">
                <GraduationCap className="h-6 w-6 text-primary-700" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Training
                </p>
                <p className="mt-1 font-display text-lg font-bold text-neutral-900">
                  Hands-on
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-accent-50 to-accent-100 p-5 ring-1 ring-border-light">
                <ShieldCheck className="h-6 w-6 text-accent-700" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Safety
                </p>
                <p className="mt-1 font-display text-lg font-bold text-neutral-900">
                  Certified
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-5 ring-1 ring-border-light">
                <Users className="h-6 w-6 text-green-700" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Group
                </p>
                <p className="mt-1 font-display text-lg font-bold text-neutral-900">
                  Available
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 ring-1 ring-border-light">
                <Award className="h-6 w-6 text-blue-700" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Outcome
                </p>
                <p className="mt-1 font-display text-lg font-bold text-neutral-900">
                  Certificate
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <SimpleCTA
          title="Ready to enroll a batch?"
          description="Call or message the admissions desk to confirm dates, attendee count, and delivery requirements."
          href="/contact-us"
          label="Contact admissions"
        />
      </section>

      <WhatsAppButton />
    </PublicShell>
  );
}
