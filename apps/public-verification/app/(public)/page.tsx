import { Badge, Button, Card, Input, PageHeader } from '@ims/shared-ui';

export default function PublicVerificationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10">
      <PageHeader
        eyebrow="Public verification"
        title="Verify a certificate number"
        description="This public App Router entry point stays isolated from protected workflows and only exposes a certificate lookup surface."
      />
      <Card className="space-y-5">
        <Badge>Public endpoint</Badge>
        <form className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Input placeholder="CERT-2026-001" />
          <Button type="submit">Verify</Button>
        </form>
        <p className="text-sm text-[color:var(--ims-muted)]">
          A real certificate lookup route handler will connect this page to the certificates package later.
        </p>
      </Card>
    </main>
  );
}
