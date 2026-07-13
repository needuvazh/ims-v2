import { ShieldCheck, Target, Award, BookOpen, Users, Compass } from 'lucide-react';
import {
  PublicShell,
  SplitHero,
  SectionHeading,
} from '../_components/public-site';
import { PublicStatStrip } from '../_components/public-content';
import { buildPublicMetadata } from '../_components/public-metadata';
import { courseCatalog } from '../_components/public-site-data';
import Link from 'next/link';

export const metadata = buildPublicMetadata({
  title: 'About ASTI',
  description:
    'Learn about Al-Saud Training Institute in Muscat, its vocational training approach, mission, and safety-focused delivery model.',
  path: '/about',
});

const coreValues = [
  {
    title: 'Safety First',
    description:
      'Every course, drill, and theoretical module is designed around maintaining a zero-harm workplace.',
    icon: ShieldCheck,
  },
  {
    title: 'Practical Mastery',
    description:
      'We prioritize direct, hands-on experience behind the controls of modern, well-maintained machinery.',
    icon: Target,
  },
  {
    title: 'Industry Competency',
    description:
      'Our curriculums are continually updated to meet Omani regulatory standards and global best practices.',
    icon: Award,
  },
];

const chooseUsStrengths = [
  {
    title: 'Deep Safety Expertise',
    description:
      'With years of experience in the field, we have developed a deep understanding of safety regulations, best practices, and industry-specific requirements.',
    icon: Compass,
  },
  {
    title: 'Tailored Solutions',
    description:
      'Our course directory covers a broad spectrum of safety topics, ensuring we have the right training for your organization’s unique site needs.',
    icon: BookOpen,
  },
  {
    title: 'Employer Recognized',
    description:
      'Our training programs are designed to meet or exceed industry standards, providing graduates with certifications recognized by leading Omani employers.',
    icon: Users,
  },
];

export default function AboutPage() {
  return (
    <PublicShell>
      {/* ─── HERO SECTION ─────────────────────────────────── */}
      <SplitHero
        eyebrow="About ASTI"
        title={
          <>
            Empowering Operators.
            <br />
            <span className="text-gradient-orange">Elevating Safety.</span>
          </>
        }
        description="Al-Saud Training Institute (ASTI) specializes in high-quality, hands-on vocational training for heavy machinery, crane operations, and industrial safety in Muscat."
        image="/alsaud/hero.jpg"
        imageAlt="Al-Saud Training Institute about page banner"
        primaryHref="/courses"
        primaryLabel="Our Courses"
        secondaryHref="/contact-us"
        secondaryLabel="Talk to Us"
        showStats={false}
      />

      {/* ─── STATISTICS ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 -mt-12 sm:px-6 lg:px-8 relative z-10">
        <PublicStatStrip />
      </section>

      {/* ─── OUR STORY ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-8 rounded-[2.5rem] border border-neutral-100 bg-white p-8 md:p-10 shadow-sm">
            <SectionHeading
              eyebrow="Our story"
              title="A Legacy of Quality Industrial Training"
            />
            <div className="space-y-6 text-sm leading-relaxed text-neutral-600">
              <p>
                At Al-Saud Training Institute (ASTI), we specialize in providing high-quality, 
                hands-on training in the operation of heavy machinery and cranes. Our focus is 
                on equipping students and corporate workforces with the practical skills, technical 
                knowledge, and safety awareness required for confident operation on busy industrial sites.
              </p>
              <p>
                Founded on the principles of practical excellence, ASTI started by training operators in forklift 
                handling, wheels, tracks, and gantry crane operations. Over the years, we have expanded our pathways 
                to include elevated work platforms (EWP), advanced safety units, and specialized certifications. 
                Today, we offer professional training and verification of competency (VOC) services to companies 
                across the Sultanate of Oman.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-neutral-100 bg-gradient-to-br from-white to-neutral-50 p-7 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
                Mission
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                To deliver premium, hands-on training that equips heavy equipment and crane operators with 
                the skills, safety protocols, and credentials necessary to succeed and maintain accident-free workplaces.
              </p>
            </div>
            <div className="rounded-[2rem] border border-neutral-100 bg-gradient-to-br from-white to-neutral-50 p-7 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
                Vision
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                To be Oman’s preferred partner for vocational operator training, promoting a strong culture of 
                safety, professionalism, and competency across Omani construction and industrial sectors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CORE VALUES ─── Light neutral bg ───────────────── */}
      <section className="bg-neutral-50 border-y border-neutral-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading 
            eyebrow="Core values" 
            title="What guides our delivery" 
            align="center"
          />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {coreValues.map((value, idx) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="group relative overflow-hidden rounded-[2rem] border border-neutral-100 bg-white p-8 shadow-sm hover:shadow-xl hover:shadow-orange-600/5 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="mb-6 inline-flex rounded-2xl bg-orange-500/10 p-4 text-orange-600 ring-1 ring-orange-500/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-neutral-900">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE US ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why choose us"
          title="Designed for safety & compliance"
          description="We make it easy for candidates to advance their careers and for businesses to remain compliant with high-risk safety requirements."
        />
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {chooseUsStrengths.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group rounded-[2rem] border border-neutral-100 bg-white p-7 shadow-sm transition-all hover:border-orange-100 hover:shadow-md"
              >
                <div className="mb-5 text-orange-500">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {item.description}
                </p>
              </div>
          );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Explore courses"
          title="Training paths that match common site requirements"
          description="These pages show the main operator training paths offered by ASTI, with practical content, duration details, and enquiry prompts."
        />
        <div className="mt-10 flex flex-wrap gap-3">
          {courseCatalog.slice(0, 4).map((course) => (
            <Link
              key={course.slug}
              href={`/${course.slug}`}
              className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-orange-200 hover:text-orange-700"
            >
              {course.title}
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
