import Link from 'next/link';
import { Card, PageHeader } from '@ims/shared-ui';

export default function TrainerPortalLanding() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
      <PageHeader
        eyebrow="Trainer portal"
        title="Session and attendance workspace"
        description="This shell will later support schedule review, attendance marking, and completion actions."
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
          The trainer experience starts as a separate App Router app with the same navigation and shell primitives.
        </p>
      </Card>
    </main>
  );
}
