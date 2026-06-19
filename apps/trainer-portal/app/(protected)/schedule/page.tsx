import { Card, PageHeader } from '@ims/shared-ui';

export default function TrainerSchedulePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected"
        title="Schedule"
        description="Placeholder for assigned sessions and timetable visibility."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">Scheduling rules live in the scheduling context.</p>
      </Card>
    </div>
  );
}
