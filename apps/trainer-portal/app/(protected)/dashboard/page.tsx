import { Card, PageHeader } from '@ims/shared-ui';

export default function TrainerDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected"
        title="Trainer dashboard"
        description="Reserved for schedule, attendance, and completion actions."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">The real workload is still in the domain packages.</p>
      </Card>
    </div>
  );
}
