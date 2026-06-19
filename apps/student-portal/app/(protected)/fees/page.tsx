import { Card, PageHeader } from '@ims/shared-ui';

export default function StudentFeesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected"
        title="Fees"
        description="Placeholder for fee summaries, receipts, and due tracking."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">Financial workflows stay in the finance context.</p>
      </Card>
    </div>
  );
}
