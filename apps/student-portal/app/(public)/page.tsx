import Link from 'next/link';
import { Card, PageHeader } from '@ims/shared-ui';

export default function StudentPortalLanding() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        eyebrow="Student portal"
        title="Learner overview"
        description="A read-first App Router shell for attendance, fees, and certificates."
        actions={
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--ims-ink)] px-4 py-2 text-sm font-medium text-[color:var(--ims-paper)] transition hover:bg-[color:var(--ims-brass)] hover:text-[color:var(--ims-ink)]"
          >
            Open dashboard
          </Link>
        }
      />
      <Card>
        <p className="text-sm leading-6 text-[color:var(--ims-muted)]">
          The student portal starts as a thin shell so the shared stack can be validated before learner workflows grow.
        </p>
      </Card>
    </main>
  );
}
