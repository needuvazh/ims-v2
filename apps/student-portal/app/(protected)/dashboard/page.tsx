import { Card, PageHeader } from '@ims/shared-ui';

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Protected"
        title="Student dashboard"
        description="Read-only navigation proves the portal shell can be reused with a different audience."
      />
      <Card>
        <p className="text-sm text-[color:var(--ims-muted)]">Attendance, fees, and certificates will connect here later.</p>
      </Card>
    </div>
  );
}
