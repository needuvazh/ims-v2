import Link from 'next/link';
import { Badge, Card, EmptyState, PageHeader } from '@ims/shared-ui';

export const metadata = {
  title: 'IMS Admin Portal',
};

export default function PublicHomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 lg:px-8">
      <PageHeader
        eyebrow="IMS foundation"
        title="A modular monolith for institute operations."
      description="This App Router shell separates public entry, authentication, and protected workflows while keeping business behavior in domain packages."
      actions={
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--ims-ink)] px-4 py-2 text-sm font-medium text-[color:var(--ims-paper)] transition hover:bg-[color:var(--ims-brass)] hover:text-[color:var(--ims-ink)]"
          >
            Sign in
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-4">
          <Badge>Architecture</Badge>
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-3xl">App Router delivers the UI. Packages own the rules.</h2>
            <p className="max-w-2xl text-sm leading-6 text-[color:var(--ims-muted)]">
              The admin portal is designed around route groups, nested layouts, server components, server actions, and
              thin route handlers. All core logic remains inside `packages/*`.
            </p>
          </div>
        </Card>
        <EmptyState
          title="Foundation slice"
          description="Identity, organization, and session scaffolding are live first so later domains can reuse the same navigation, auth, and shell patterns."
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--ims-border)] bg-[color:var(--ims-surface)] px-4 py-2 text-sm font-medium text-[color:var(--ims-ink)] transition hover:border-[color:var(--ims-ink)]"
          >
            Open dashboard
          </Link>
        </EmptyState>
      </div>
    </main>
  );
}
