import { Card, PageHeader } from '@ims/shared-ui';

export default function TrainerAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected"
        title="Attendance"
        description="Placeholder for attendance entry and review."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">Attendance rules remain in the attendance package.</p>
      </Card>
    </div>
  );
}
